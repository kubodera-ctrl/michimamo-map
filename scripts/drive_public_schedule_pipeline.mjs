import crypto from 'node:crypto';

const INFO_TYPES=new Set(['PUBLIC_SCHEDULE','STATEWIDE_DAY']);
const TIME_PRECISIONS=new Set(['POLICY','ALL_DAY','DAYPART','DATE_ONLY']);
const GEO_PRECISIONS=new Set(['PREFECTURE','LOCALITY','ROAD_AREA']);
const DISPLAY_MODES=new Set(['POLICY_ONLY','PREFECTURE_DATE','LOCALITY_SCHEDULED','ROAD_AREA_TIMED']);

function clean(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));}

export function sourceHash(bundle){
  return crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
}

export function normalizeScheduleRecord(source,raw){
  if(!raw?.externalId||!INFO_TYPES.has(raw.infoType))throw new Error('invalid_schedule_identity');
  if(!TIME_PRECISIONS.has(raw.timePrecision))throw new Error('invalid_time_precision');
  if(!GEO_PRECISIONS.has(raw.geoPrecision))throw new Error('invalid_geo_precision');
  if(!DISPLAY_MODES.has(raw.displayMode))throw new Error('invalid_display_mode');
  if(raw.validDate&&!validDate(raw.validDate))throw new Error('invalid_valid_date');
  if(raw.infoType==='STATEWIDE_DAY'&&!raw.validDate)throw new Error('statewide_date_required');
  const enforcementType=clean(raw.enforcementType);
  if(!enforcementType)throw new Error('enforcement_type_required');

  return Object.freeze({
    eventKey:source.sourceKey+':'+raw.externalId,
    externalId:raw.externalId,
    sourceKey:source.sourceKey,
    sourceVersionDate:source.sourceVersionDate,
    prefectureCode:source.prefectureCode,
    policeOrg:source.policeOrg,
    infoType:raw.infoType,
    enforcementType,
    routeName:null,
    localityText:null,
    areaText:clean(raw.areaText)||null,
    validDate:raw.validDate||null,
    validFrom:raw.validDate?raw.validDate:source.periodStart,
    validTo:raw.validDate?raw.validDate:source.periodEnd,
    timePrecision:raw.timePrecision,
    timeText:clean(raw.timeText)||null,
    geoPrecision:raw.geoPrecision,
    displayMode:raw.displayMode,
    sourceUrl:source.sourceUrl,
    sourceVerifiedAt:source.verifiedAt,
    freshnessStatus:source.freshnessStatus,
    scheduleChangeNote:'公開内容は実際の取締実施場所・実施時刻を断定するものではありません。'
  });
}

export function publicationGate(bundle,{mode='preview'}={}){
  const reasons=[];
  if(bundle?.source?.freshnessStatus!=='CURRENT')reasons.push('source_not_current');
  if(!Array.isArray(bundle?.records)||!bundle.records.length)reasons.push('no_records');
  if(mode==='production'&&bundle?.source?.termsStatus!=='ALLOWED')reasons.push('terms_not_allowed');
  return Object.freeze({publishable:reasons.length===0,reasons:Object.freeze(reasons)});
}

export function buildScheduleSnapshot(bundle,{mode='preview'}={}){
  if(!bundle?.source||bundle.source.sourceFamily!=='PUBLIC_SCHEDULE'||!Array.isArray(bundle.records))throw new Error('invalid_schedule_bundle');
  if(!validDate(bundle.source.periodStart)||!validDate(bundle.source.periodEnd)||bundle.source.periodEnd<bundle.source.periodStart)throw new Error('invalid_source_period');
  const gate=publicationGate(bundle,{mode});
  const hash=sourceHash(bundle);
  if(!gate.publishable)return Object.freeze({schemaVersion:1,sourceKey:bundle.source.sourceKey,sourceHash:hash,gate,events:Object.freeze([])});
  const events=bundle.records.map(row=>normalizeScheduleRecord(bundle.source,row));
  const keys=new Set();
  for(const event of events){
    if(keys.has(event.eventKey))throw new Error('duplicate_schedule_event');
    keys.add(event.eventKey);
  }
  return Object.freeze({
    schemaVersion:1,
    sourceKey:bundle.source.sourceKey,
    sourceVersionDate:bundle.source.sourceVersionDate,
    sourceHash:hash,
    periodStart:bundle.source.periodStart,
    periodEnd:bundle.source.periodEnd,
    gate,
    events:Object.freeze(events)
  });
}
