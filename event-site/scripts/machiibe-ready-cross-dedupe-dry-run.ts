import fs from 'node:fs';
import path from 'node:path';
import {parseCsv,normalizeCommonItem} from '../../shared/machiibe-ingestion/adapters';
import type {NormalizedEventCandidate,RawSourceItem,SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';
import {dedupeCrossSourceCandidates,type CrossSourceCandidate} from '../../shared/machiibe-ingestion/dedupe';
import {assessSupplyCandidate} from '../../shared/machiibe-ingestion/supply-quality';

type RegistryRow={
  source_key:string;
  source_name:string;
  source_type:string;
  prefecture?:string|null;
  municipality?:string|null;
  base_url:string;
  feed_url?:string|null;
  fetch_method:string;
  terms_status:string;
  robots_status:string;
  commercial_use_status:string;
  reuse_status?:string;
  redistribution_status?:string;
  cache_status?:string;
  attribution_requirement?:string|null;
  review_state:string;
  automated_fetch_allowed:boolean;
  encoding?:string;
  max_fetch_bytes?:number;
  content_type_expected?:string[];
  observed_current_items_min?:number|null;
};

type BatchCandidate=CrossSourceCandidate&{
  sourceKey:string;
  titleLabel:string;
  officialUrlLabel:string|null;
  startAtLabel:string|null;
  venueLabel:string|null;
};

function stableSourceId(sourceKey:string){
  let hash=2166136261;
  for(let i=0;i<sourceKey.length;i++){
    hash^=sourceKey.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0)||1;
}

function sourceSnapshot(row:RegistryRow):SourcePolicySnapshot{
  if(row.review_state!=='READY'||row.automated_fetch_allowed!==true){
    throw new Error('source is not READY for batch dry-run: '+row.source_key);
  }
  if(row.terms_status!=='reviewed_allowed')throw new Error('terms not approved: '+row.source_key);
  if(!['allowed','not_applicable'].includes(row.robots_status))throw new Error('access policy unclear: '+row.source_key);
  if(row.commercial_use_status!=='allowed'||row.reuse_status!=='allowed'){
    throw new Error('commercial/reuse gate not approved: '+row.source_key);
  }
  if(row.fetch_method!=='OPEN_DATA')throw new Error('batch CLI supports READY OPEN_DATA CSV only: '+row.source_key);
  const feed=row.feed_url||'';
  if(!feed.startsWith('https://'))throw new Error('READY source requires HTTPS feed: '+row.source_key);
  return {
    sourceId:stableSourceId(row.source_key),
    sourceName:row.source_name,
    sourceType:row.source_type,
    prefecture:row.prefecture||null,
    municipality:row.municipality||null,
    baseUrl:row.base_url,
    feedUrl:feed,
    fetchMethod:'OPEN_DATA',
    termsStatus:'reviewed_allowed',
    robotsStatus:row.robots_status as 'allowed'|'not_applicable',
    commercialUseStatus:'allowed',
    reuseStatus:'allowed',
    redistributionStatus:row.redistribution_status==='conditional'?'conditional':'allowed',
    cacheStatus:row.cache_status==='conditional'?'conditional':'allowed',
    imageUseStatus:'not_applicable',
    snsUseStatus:'not_applicable',
    attributionRequirement:row.attribution_requirement||null,
    sourceStage:'FETCH_ALLOWED',
    lastTermsCheckedAt:'2026-09-30',
    updateFrequencyMinutes:1440,
    lastCheckedAt:null,
    lastSuccessAt:null,
    failureCount:0,
    active:true,
    priority:100,
    automatedFetchAllowed:true,
    etag:null,
    lastModified:null
  };
}

function decodeCsvBytes(bytes:Uint8Array,preferred?:string){
  const encodings=preferred?[preferred]:['utf-8','shift_jis'];
  const anchors=['イベント名','記事タイトル','開始日','イベント開始日','終了日','イベント終了日','場所','市町','ID','URL'];
  const candidates=encodings.map((encoding,index)=>{
    try{
      const body=new TextDecoder(encoding).decode(bytes);
      const head=body.slice(0,4000);
      const replacementCount=(body.match(/\uFFFD/g)||[]).length;
      const anchorHits=anchors.filter((anchor)=>head.includes(anchor)).length;
      return {encoding,body,replacementCount,anchorHits,score:anchorHits*100-replacementCount*10-index};
    }catch{
      return {encoding,body:'',replacementCount:Number.MAX_SAFE_INTEGER,anchorHits:0,score:Number.MIN_SAFE_INTEGER};
    }
  });
  const best=candidates.slice().sort((a,b)=>b.score-a.score)[0];
  if(!best||best.score===Number.MIN_SAFE_INTEGER)throw new Error('unable to decode source bytes');
  return best;
}

function exactIdentity(candidate:NormalizedEventCandidate){
  return [
    candidate.sourceEventId||'',
    candidate.title||'',
    candidate.startAt||'',
    candidate.endAt||'',
    candidate.venueName||'',
    candidate.municipality||''
  ].join('|');
}

function organizerFromRaw(item:RawSourceItem|undefined){
  if(!item||item.payload===null||typeof item.payload!=='object'||Array.isArray(item.payload))return null;
  const payload=item.payload as Record<string,unknown>;
  for(const key of ['organizer','主催者','host']){
    const value=payload[key];
    if(typeof value==='string'&&value.trim())return value.trim();
  }
  return null;
}

async function fetchBytes(row:RegistryRow,source:SourcePolicySnapshot){
  let response:Response|null=null;
  let transportError:unknown=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      response=await fetch(source.feedUrl!,{
        method:'GET',
        headers:{accept:'text/csv,application/octet-stream,*/*;q=0.8'},
        redirect:'follow',
        signal:AbortSignal.timeout(30_000)
      });
      break;
    }catch(error){
      transportError=error;
      if(attempt===1)await new Promise((resolve)=>setTimeout(resolve,1500));
    }
  }
  if(!response){
    const cause=transportError instanceof Error
      ?String((transportError as Error&{cause?:unknown}).cause||transportError.message)
      :String(transportError);
    throw new Error(row.source_key+': network fetch failed after one retry: '+cause);
  }
  if(!response.ok)throw new Error(row.source_key+': fetch failed: '+response.status);
  const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const expected=(row.content_type_expected||[]).map((value)=>value.toLowerCase());
  if(expected.length&&contentType&&!expected.includes(contentType)){
    throw new Error(row.source_key+': unexpected content-type: '+contentType);
  }
  const bytes=new Uint8Array(await response.arrayBuffer());
  const limit=row.max_fetch_bytes||10_000_000;
  if(bytes.byteLength>limit)throw new Error(row.source_key+': byte limit exceeded');
  return {response,bytes,limit,contentType};
}

function pairView(pair:{leftId:string;rightId:string;confidence:number;reviewReason?:string},byId:Map<string,BatchCandidate>){
  const left=byId.get(pair.leftId),right=byId.get(pair.rightId);
  return {
    confidence:pair.confidence,
    reviewReason:pair.reviewReason||null,
    left:left?{
      candidateId:left.candidateId,sourceKey:left.sourceKey,title:left.titleLabel,
      officialUrl:left.officialUrlLabel,startAt:left.startAtLabel,venue:left.venueLabel
    }:null,
    right:right?{
      candidateId:right.candidateId,sourceKey:right.sourceKey,title:right.titleLabel,
      officialUrl:right.officialUrlLabel,startAt:right.startAtLabel,venue:right.venueLabel
    }:null
  };
}

async function main(){
  const registryPath=path.resolve(process.cwd(),'../data/machiibe/national_source_discovery_v1.json');
  const registry=JSON.parse(fs.readFileSync(registryPath,'utf8')) as {sources:RegistryRow[]};
  const readyRows=registry.sources.filter((row)=>row.review_state==='READY'&&row.automated_fetch_allowed===true);
  if(!readyRows.length)throw new Error('no READY sources');

  const today=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date());

  const sourceResults:Array<Record<string,unknown>>=[];
  const batchCandidates:BatchCandidate[]=[];

  for(const row of readyRows){
    const source=sourceSnapshot(row);
    const {response,bytes,limit,contentType}=await fetchBytes(row,source);
    const decoded=decodeCsvBytes(bytes,row.encoding?.toLowerCase());
    const parsed=parseCsv(decoded.body,source);
    const rawByHash=new Map(parsed.items.map((item)=>[item.sourceHash,item] as const));
    const normalized=parsed.items.map((item)=>normalizeCommonItem(item,source));
    const exact=new Map<string,NormalizedEventCandidate>();
    for(const item of normalized){
      const key=exactIdentity(item);
      if(!exact.has(key))exact.set(key,item);
    }
    const deduped=[...exact.values()];
    const assessed=deduped.map((candidate)=>({
      candidate,
      assessment:assessSupplyCandidate(candidate,source,today)
    }));
    const publishable=assessed.filter((row)=>row.assessment.publishable).map((row)=>row.candidate);

    for(const candidate of publishable){
      const raw=rawByHash.get(candidate.sourceHash);
      const idPart=candidate.sourceEventId||candidate.sourceHash;
      batchCandidates.push({
        candidateId:source.sourceId+':'+idPart,
        sourceId:source.sourceId,
        sourceEventId:candidate.sourceEventId,
        officialUrl:candidate.officialUrl,
        title:candidate.title,
        startAt:candidate.startAt,
        endAt:candidate.endAt,
        venueName:candidate.venueName,
        municipality:candidate.municipality,
        lat:candidate.lat,
        lng:candidate.lng,
        organizer:organizerFromRaw(raw),
        sourceKey:row.source_key,
        titleLabel:candidate.title||'',
        officialUrlLabel:candidate.officialUrl,
        startAtLabel:candidate.startAt,
        venueLabel:candidate.venueName
      });
    }

    sourceResults.push({
      sourceKey:row.source_key,
      sourceId:source.sourceId,
      httpStatus:response.status,
      contentType,
      bytesReceived:bytes.byteLength,
      byteLimit:limit,
      encoding:decoded.encoding,
      fetched:parsed.items.length,
      normalized:assessed.filter((item)=>item.assessment.normalized).length,
      dedupedWithinSource:deduped.length,
      valid:assessed.filter((item)=>item.assessment.valid).length,
      publishable:publishable.length
    });
  }

  const dedupe=dedupeCrossSourceCandidates(batchCandidates);
  const byId=new Map(batchCandidates.map((candidate)=>[candidate.candidateId,candidate] as const));
  const reviewByReason=dedupe.reviewPairs.reduce<Record<string,number>>((acc,pair)=>{
    const key=pair.reviewReason||'unknown';
    acc[key]=(acc[key]||0)+1;
    return acc;
  },{});

  const output={
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    productionChange:false,
    today,
    readySourceCount:readyRows.length,
    sourceResults,
    publishableInput:batchCandidates.length,
    crossSourceDedup:{
      autoMergePairCount:dedupe.autoMergePairs.length,
      reviewPairCount:dedupe.reviewPairs.length,
      reviewByReason,
      clusterCount:dedupe.clusters.length,
      uniqueAfterAutoMerge:dedupe.uniqueAfterAutoMerge,
      duplicatesRemovedByAutoMerge:batchCandidates.length-dedupe.uniqueAfterAutoMerge,
      autoMergePairs:dedupe.autoMergePairs.slice(0,50).map((pair)=>pairView(pair,byId)),
      reviewPairs:dedupe.reviewPairs.slice(0,50).map((pair)=>pairView(pair,byId)),
      clusters:dedupe.clusters.slice(0,50).map((cluster)=>cluster.map((id)=>{
        const row=byId.get(id);
        return row?{candidateId:id,sourceKey:row.sourceKey,title:row.titleLabel,officialUrl:row.officialUrlLabel}:null;
      }).filter(Boolean))
    }
  };
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}

main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
