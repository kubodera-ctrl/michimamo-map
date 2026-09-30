import crypto from 'node:crypto';

const INFO_TYPES=new Set(['PUBLIC_SCHEDULE','STATEWIDE_DAY']);
const TIME_PRECISIONS=new Set(['POLICY','ALL_DAY','DAYPART','DATE_ONLY']);
const GEO_PRECISIONS=new Set(['PREFECTURE','LOCALITY','ROAD_AREA']);
const DISPLAY_MODES=new Set(['POLICY_ONLY','PREFECTURE_DATE','LOCALITY_SCHEDULED','ROAD_AREA_TIMED']);

function clean(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));}
function normalizeLocationPoint(value){
  if(value==null)return null;
  if(!Array.isArray(value)||value.length!==2)throw new Error('invalid_location_point');
  const lat=Number(value[0]),lng=Number(value[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180)throw new Error('invalid_location_point');
  return Object.freeze([lat,lng]);
}

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
    locationPoint:normalizeLocationPoint(raw.locationPoint),
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

export function buildPublicSchedulePreview(bundle){
  const snapshot=buildScheduleSnapshot(bundle,{mode:'preview'});
  if(!snapshot.gate.publishable)throw new Error('schedule_preview_not_publishable');
  return Object.freeze({
    schemaVersion:1,
    sourceLabel:bundle.source.policeOrg+' 公開交通取締り',
    sourceUrl:bundle.source.sourceUrl,
    sourceVersionDate:bundle.source.sourceVersionDate,
    sourceVerifiedAt:bundle.source.verifiedAt,
    freshnessStatus:bundle.source.freshnessStatus,
    sourceHash:snapshot.sourceHash,
    periodStart:snapshot.periodStart,
    periodEnd:snapshot.periodEnd,
    events:Object.freeze(snapshot.events.map(event=>Object.freeze({
      id:event.externalId,
      eventKey:event.eventKey,
      enforcementType:event.enforcementType,
      areaText:event.areaText,
      validDate:event.validDate,
      validFrom:event.validFrom,
      validTo:event.validTo,
      timePrecision:event.timePrecision,
      timeText:event.timeText,
      geoPrecision:event.geoPrecision,
      displayMode:event.displayMode,
      locationPoint:event.locationPoint,
      sourceUrl:event.sourceUrl,
      sourceVerifiedAt:event.sourceVerifiedAt,
      freshnessStatus:event.freshnessStatus,
      scheduleChangeNote:event.scheduleChangeNote
    })))
  });
}
