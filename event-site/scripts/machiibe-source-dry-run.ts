import fs from 'node:fs';
import path from 'node:path';
import {parseCsv,normalizeCommonItem} from '../../shared/machiibe-ingestion/adapters';
import type {RawSourceItem,SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';
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
  content_type_expected?:string[];
  observed_current_items_min?:number|null;
  expected_update_frequency?:string|null;
  freshness_confidence?:string|null;
};

function sourceSnapshot(row:RegistryRow):SourcePolicySnapshot{
  if(row.review_state!=='READY'||row.automated_fetch_allowed!==true){
    throw new Error('source is not READY for automated dry-run fetch');
  }
  if(row.terms_status!=='reviewed_allowed') throw new Error('READY source terms are not approved');
  if(!['allowed','not_applicable'].includes(row.robots_status)) throw new Error('READY source access policy is not clear');
  if(row.commercial_use_status!=='allowed'||row.reuse_status!=='allowed'){
    throw new Error('READY source commercial/reuse gates are not approved');
  }
  if(row.fetch_method!=='OPEN_DATA') throw new Error('dry-run CLI currently supports OPEN_DATA CSV only');
  const feed=row.feed_url||'';
  if(!feed.startsWith('https://')) throw new Error('READY source requires an HTTPS feed URL');
  return {
    sourceId:1,sourceName:row.source_name,sourceType:row.source_type,
    prefecture:row.prefecture||null,municipality:row.municipality||null,
    baseUrl:row.base_url,feedUrl:feed,fetchMethod:'OPEN_DATA',
    termsStatus:'reviewed_allowed',
    robotsStatus:row.robots_status as 'allowed'|'not_applicable',
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

function payloadHeaders(item:RawSourceItem|undefined){
  if(!item||item.payload===null||typeof item.payload!=='object'||Array.isArray(item.payload))return [] as string[];
  return Object.keys(item.payload as Record<string,unknown>);
}
function hasAny(headers:string[],candidates:string[]){
  return candidates.some((name)=>headers.includes(name));
}
function canonicalDate(value:string|null){
  if(!value)return null;
  const match=value.trim().match(/^(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})(?:日)?/);
  if(!match)return null;
  const month=String(Number(match[2])).padStart(2,'0');
  const day=String(Number(match[3])).padStart(2,'0');
  return match[1]+'-'+month+'-'+day;
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
    headers:{accept:'text/csv,application/octet-stream,*/*;q=0.8'},
    redirect:'follow',
    signal:AbortSignal.timeout(30_000)
  });
  if(!response.ok) throw new Error('fetch failed: '+response.status);
  const contentType=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const expectedTypes=(row.content_type_expected||[]).map((value)=>value.toLowerCase());
  if(expectedTypes.length&&contentType&&!expectedTypes.includes(contentType)){
    throw new Error('unexpected content-type: '+contentType);
  }

  const bytes=new Uint8Array(await response.arrayBuffer());
  const max=row.max_fetch_bytes||10_000_000;
  if(bytes.byteLength>max) throw new Error('fetch exceeds byte limit');
  const encoding=(row.encoding||'utf-8').toLowerCase();
  let body:string;
  try{body=new TextDecoder(encoding).decode(bytes);}
  catch{throw new Error('unsupported or invalid text encoding: '+encoding);}

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

  const headers=payloadHeaders(parsed.items[0]);
  const schema={
    headers,
    titleField:hasAny(headers,['name','title','イベント名','名称','記事タイトル']),
    startField:hasAny(headers,['startDate','start_at','start','開始日時','開始日','イベント開始日']),
    endField:hasAny(headers,['endDate','end_at','end','終了日時','終了日','イベント終了日']),
    locationField:hasAny(headers,['venue_name','会場','場所','address','住所','municipality','市区町村','市区郡','市町']),
    officialUrlField:hasAny(headers,['url','official_url','公式URL','URL','link'])
  };
  if(!schema.titleField||!schema.startField)throw new Error('required CSV schema fields are missing');

  const startDateParseable=normalized.filter((item)=>canonicalDate(item.startAt)!==null).length;
  const endDateParseable=normalized.filter((item)=>!item.endAt||canonicalDate(item.endAt)!==null).length;
  const withLocation=normalized.filter((item)=>Boolean(item.venueName||item.address||item.municipality||(item.lat!==null&&item.lng!==null))).length;
  const withOfficialUrl=normalized.filter((item)=>Boolean(item.officialUrl)).length;
  const ended=normalized.filter((item)=>{
    const key=canonicalDate(item.endAt||item.startAt);
    return Boolean(key&&key<today);
  }).length;
  const normalizedCount=assessed.filter((item)=>item.normalized).length;
  const invalidReasons=Object.entries(
    assessed.flatMap((item)=>item.errors).reduce<Record<string,number>>((acc,key)=>{
      acc[key]=(acc[key]||0)+1;return acc;
    },{})
  ).sort((a,b)=>b[1]-a[1]);

  const output={
    sourceKey,
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    http:{
      status:response.status,
      contentType,
      contentTypeAccepted:expectedTypes.length===0||!contentType||expectedTypes.includes(contentType),
      etag:response.headers.get('etag'),
      lastModified:response.headers.get('last-modified')
    },
    bytes:{received:bytes.byteLength,limit:max,withinLimit:bytes.byteLength<=max},
    encoding:{requested:encoding,decoded:true},
    schema,
    quality:{
      parserWarnings:parsed.warnings,
      dateParse:{startParseable:startDateParseable,totalWithStart:normalized.filter((item)=>Boolean(item.startAt)).length,endParseable:endDateParseable,total:normalized.length},
      location:{withLocation,total:normalized.length},
      officialUrl:{withOfficialUrl,total:normalized.length,feedUrlUsedAsOfficialUrl:false},
      identity:{unique:deduped.length,duplicatesRemoved:normalized.length-deduped.length},
      ended:{count:ended,today}
    },
    policy:{
      sourceStage:source.sourceStage,
      attribution:source.attributionRequirement,
      expectedUpdateFrequency:row.expected_update_frequency||null,
      freshnessConfidence:row.freshness_confidence||null,
      eventFactsAllowed:true,
      mediaRightsSeparated:true,
      imageMode:'none',
      imageRights:'unknown'
    },
    funnel:{
      potential:Number(row.observed_current_items_min)||0,
      fetched:parsed.items.length,
      normalized:normalizedCount,
      deduped:deduped.length,
      valid:assessed.filter((item)=>item.valid).length,
      publishable:assessed.filter((item)=>item.publishable).length,
      active:0
    },
    invalidReasons
  };
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}
main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
