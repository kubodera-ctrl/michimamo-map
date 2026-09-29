import fs from 'node:fs';
import path from 'node:path';
import {parseCsv,normalizeCommonItem} from '../../shared/machiibe-ingestion/adapters';
import type {SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';
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
  image_use_status?:string;
  sns_use_status?:string;
  attribution_requirement?:string|null;
  review_state:string;
  automated_fetch_allowed:boolean;
  encoding?:string;
  max_fetch_bytes?:number;
  observed_current_items_min?:number|null;
};

function sourceSnapshot(row:RegistryRow):SourcePolicySnapshot{
  if(row.review_state!=='READY'||row.automated_fetch_allowed!==true){
    throw new Error('source is not READY for automated dry-run fetch');
  }
  if(row.fetch_method!=='OPEN_DATA') throw new Error('dry-run CLI currently supports OPEN_DATA CSV only');
  const feed=row.feed_url||'';
  if(!feed.startsWith('https://')) throw new Error('READY source requires an HTTPS feed URL');
  return {
    sourceId:1,sourceName:row.source_name,sourceType:row.source_type,
    prefecture:row.prefecture||null,municipality:row.municipality||null,
    baseUrl:row.base_url,feedUrl:feed,fetchMethod:'OPEN_DATA',
    termsStatus:'reviewed_allowed',
    robotsStatus:row.robots_status==='not_applicable'?'not_applicable':'allowed',
    commercialUseStatus:'allowed',reuseStatus:'allowed',
    redistributionStatus:row.redistribution_status==='conditional'?'conditional':'allowed',
    cacheStatus:row.cache_status==='conditional'?'conditional':'allowed',
    imageUseStatus:'not_applicable',snsUseStatus:'not_applicable',
    attributionRequirement:row.attribution_requirement||null,
    sourceStage:'FETCH_ALLOWED',lastTermsCheckedAt:'2026-09-29',
    updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,
    active:true,priority:100,automatedFetchAllowed:true,etag:null,lastModified:null
  };
}

function exactIdentity(candidate:ReturnType<typeof normalizeCommonItem>){
  return [
    candidate.sourceEventId||'',
    candidate.title||'',
    candidate.startAt||'',
    candidate.endAt||'',
    candidate.venueName||'',
    candidate.municipality||''
  ].join('|');
}

async function main(){
  const sourceKey=process.argv[2];
  if(!sourceKey) throw new Error('usage: npm run source:dry-run -- <source_key>');
  const registryPath=path.resolve(process.cwd(),'../data/machiibe/national_source_discovery_v1.json');
  const registry=JSON.parse(fs.readFileSync(registryPath,'utf8')) as {sources:RegistryRow[]};
  const row=registry.sources.find((item)=>item.source_key===sourceKey);
  if(!row) throw new Error('source not found: '+sourceKey);
  const source=sourceSnapshot(row);
  const response=await fetch(source.feedUrl!,{
    method:'GET',
    headers:{accept:'text/csv,*/*;q=0.8'},
    redirect:'follow',
    signal:AbortSignal.timeout(30_000)
  });
  if(!response.ok) throw new Error('fetch failed: '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());
  const max=row.max_fetch_bytes||10_000_000;
  if(bytes.byteLength>max) throw new Error('fetch exceeds byte limit');
  const decoder=new TextDecoder(row.encoding||'utf-8');
  const body=decoder.decode(bytes);
  const parsed=parseCsv(body,source);
  const normalized=parsed.items.map((item)=>normalizeCommonItem(item,source));
  const exact=new Map<string,(typeof normalized)[number]>();
  for(const item of normalized){
    const key=exactIdentity(item);
    if(!exact.has(key)) exact.set(key,item);
  }
  const deduped=[...exact.values()];
  const today=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date());
  const assessed=deduped.map((item)=>assessSupplyCandidate(item,source,today));
  const output={
    sourceKey,
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    potential:Number(row.observed_current_items_min)||0,
    fetched:parsed.items.length,
    normalized:normalized.filter((item)=>Boolean(item.title&&item.sourceUrl)).length,
    deduped:deduped.length,
    valid:assessed.filter((item)=>item.valid).length,
    publishable:assessed.filter((item)=>item.publishable).length,
    active:0,
    bytes:bytes.byteLength,
    warnings:parsed.warnings,
    invalidReasons:Object.entries(
      assessed.flatMap((item)=>item.errors).reduce<Record<string,number>>((acc,key)=>{
        acc[key]=(acc[key]||0)+1;return acc;
      },{})
    ).sort((a,b)=>b[1]-a[1])
  };
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}
main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
