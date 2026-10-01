import fs from 'node:fs';
import path from 'node:path';
import {parseCsv,normalizeCommonItem} from '../../shared/machiibe-ingestion/adapters';
import type {RawSourceItem,SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';

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
  attribution_requirement?:string|null;
  review_state:string;
  automated_fetch_allowed:boolean;
  encoding?:string;
  max_fetch_bytes?:number;
  content_type_expected?:string[];
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
  if(row.review_state!=='TERMS_REVIEWED')throw new Error('preflight requires TERMS_REVIEWED source');
  if(row.terms_status!=='reviewed_allowed')throw new Error('terms not approved');
  if(!['allowed','not_applicable'].includes(row.robots_status))throw new Error('access policy not clear');
  if(row.commercial_use_status!=='allowed'||row.reuse_status!=='allowed')throw new Error('commercial/reuse gate not approved');
  if(row.fetch_method!=='OPEN_DATA')throw new Error('preflight supports OPEN_DATA CSV only');
  const feed=row.feed_url||'';
  if(!feed.startsWith('https://'))throw new Error('HTTPS feed URL required');
  return {
    sourceId:stableSourceId(row.source_key),sourceName:row.source_name,sourceType:row.source_type,
    prefecture:row.prefecture||null,municipality:row.municipality||null,
    baseUrl:row.base_url,feedUrl:feed,fetchMethod:'OPEN_DATA',
    termsStatus:'reviewed_allowed',robotsStatus:row.robots_status as 'allowed'|'not_applicable',
    commercialUseStatus:'allowed',reuseStatus:'allowed',
    redistributionStatus:'allowed',cacheStatus:'allowed',
    imageUseStatus:'not_applicable',snsUseStatus:'not_applicable',
    attributionRequirement:row.attribution_requirement||null,
    sourceStage:'TERMS_REVIEWED',lastTermsCheckedAt:'2026-09-30',
    updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,
    active:false,priority:0,automatedFetchAllowed:false,etag:null,lastModified:null
  };
}

function decodeCsvBytes(bytes:Uint8Array,preferred?:string){
  const encodings=preferred?[preferred]:['utf-8','shift_jis'];
  const anchors=['イベント','行事','名称','開催','開始','終了','場所','会場','URL','日'];
  const candidates=encodings.map((encoding,index)=>{
    try{
      const body=new TextDecoder(encoding).decode(bytes);
      const head=body.slice(0,5000);
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

async function fetchWithOneRetry(url:string){
  let last:unknown=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{
        headers:{accept:'text/csv,application/octet-stream,*/*;q=0.8'},
        redirect:'follow',
        signal:AbortSignal.timeout(30_000)
      });
      if(!response.ok)throw new Error('fetch failed: '+response.status);
      return response;
    }catch(error){
      last=error;
      if(attempt===1)await new Promise((resolve)=>setTimeout(resolve,1500));
    }
  }
  const cause=last instanceof Error?String((last as Error&{cause?:unknown}).cause||last.message):String(last);
  throw new Error('network fetch failed after one retry: '+cause);
}

function recordPayload(item:RawSourceItem|undefined){
  return item&&item.payload!==null&&typeof item.payload==='object'&&!Array.isArray(item.payload)
    ?item.payload as Record<string,unknown>
    :{};
}
function stringValue(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function dateOnly(value:string|null){
  if(!value)return null;
  const match=value.match(/(20\d{2})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})/);
  if(!match)return null;
  return match[1]+'-'+String(Number(match[2])).padStart(2,'0')+'-'+String(Number(match[3])).padStart(2,'0');
}
function candidateDates(payload:Record<string,unknown>){
  const out:string[]=[];
  for(const [key,value] of Object.entries(payload)){
    if(!/日|date|期間|開催|開始|終了/i.test(key))continue;
    const text=stringValue(value);
    if(!text)continue;
    const found=dateOnly(text);
    if(found)out.push(found);
  }
  return out;
}
function webUrl(value:unknown){
  const text=stringValue(value);
  return text&&/^https?:\/\//i.test(text)?text:null;
}

async function main(){
  const sourceKey=process.argv[2];
  if(!sourceKey)throw new Error('usage: npm run source:preflight-csv -- <source_key>');
  const registryPath=path.resolve(process.cwd(),'../data/machiibe/national_source_discovery_v1.json');
  const registry=JSON.parse(fs.readFileSync(registryPath,'utf8')) as {sources:RegistryRow[]};
  const row=registry.sources.find((item)=>item.source_key===sourceKey);
  if(!row)throw new Error('source not found: '+sourceKey);
  const source=sourceSnapshot(row);

  const response=await fetchWithOneRetry(source.feedUrl!);
  const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const expected=(row.content_type_expected||[]).map((value)=>value.toLowerCase());
  if(expected.length&&contentType&&!expected.includes(contentType))throw new Error('unexpected content-type: '+contentType);

  const bytes=new Uint8Array(await response.arrayBuffer());
  const limit=row.max_fetch_bytes||2_000_000;
  if(bytes.byteLength>limit)throw new Error('fetch exceeds byte limit');
  const decoded=decodeCsvBytes(bytes,row.encoding?.toLowerCase());
  const parsed=parseCsv(decoded.body,source);
  const headers=Object.keys(recordPayload(parsed.items[0]));
  const normalized=parsed.items.map((item)=>normalizeCommonItem(item,source));
  const rawDates=parsed.items.flatMap((item)=>candidateDates(recordPayload(item))).sort();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const withLocation=normalized.filter((item)=>Boolean(item.venueName||item.address||item.municipality||(item.lat!==null&&item.lng!==null))).length;
  const withOfficialUrl=normalized.filter((item)=>Boolean(item.officialUrl)).length;
  const rawWebUrlRows=parsed.items.filter((item)=>Object.values(recordPayload(item)).some((value)=>Boolean(webUrl(value)))).length;

  process.stdout.write(JSON.stringify({
    sourceKey,
    sourceId:source.sourceId,
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    productionChange:false,
    policy:{
      registryState:row.review_state,
      automatedFetchAllowed:row.automated_fetch_allowed,
      attribution:row.attribution_requirement||null
    },
    http:{
      status:response.status,
      contentType,
      etag:response.headers.get('etag'),
      lastModified:response.headers.get('last-modified')
    },
    bytes:{received:bytes.byteLength,limit},
    encoding:{detected:decoded.encoding,replacementCount:decoded.replacementCount,headerAnchorHits:decoded.anchorHits},
    csv:{rows:parsed.items.length,headers,parserWarnings:parsed.warnings},
    dateEvidence:{
      rawDateCount:rawDates.length,
      minDate:rawDates[0]||null,
      maxDate:rawDates.at(-1)||null,
      currentOrFutureDates:rawDates.filter((date)=>date>=today).length,
      today
    },
    normalizedEvidence:{
      withTitle:normalized.filter((item)=>Boolean(item.title)).length,
      withStartAt:normalized.filter((item)=>Boolean(item.startAt)).length,
      withLocation,
      withOfficialUrl,
      rawRowsWithAnyWebUrl:rawWebUrlRows
    },
    sampleRows:parsed.items.slice(0,2).map((item)=>recordPayload(item))
  },null,2)+'\n');
}
main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
