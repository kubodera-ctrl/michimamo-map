import crypto from 'node:crypto';

const VALID_FRESHNESS=new Set(['CURRENT','AGING','STALE','UNKNOWN']);
const VALID_SCOPE=new Set(['SEGMENT','AREA','WHOLE_ROUTE','STATION_AREA','PREFECTURE']);
const VALID_FOCUS=new Set(['METROPOLITAN_FOCUS','STATION_FOCUS']);

function text(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}

export function parseClock(value){
  const v=text(value);
  const m=/^(\d{1,2}):(\d{2})$/.exec(v);
  if(!m)throw new Error('invalid_time:'+v);
  const h=Number(m[1]),min=Number(m[2]);
  if((h<0||h>24)||min<0||min>59||(h===24&&min!==0))throw new Error('invalid_time:'+v);
  return h*60+min;
}

export function parseSpeed(value){
  const speedText=text(value);
  const values=[...speedText.matchAll(/(\d+)/g)].map(m=>Number(m[1]));
  if(!values.length)throw new Error('invalid_speed:'+speedText);
  return Object.freeze({
    speedLimitKmh:values[0],
    speedLimitText:speedText,
    alternateSpeedKmh:Object.freeze(values.slice(1))
  });
}

export function sourceHash(bundle){
  return crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
}

export function normalizeRecord(source,raw,endpoints={}){
  const routeName=text(raw.routeName),start=text(raw.segmentStartText),end=text(raw.segmentEndText);
  if(!raw.externalId||!routeName)throw new Error('missing_identity');
  if(!VALID_FRESHNESS.has(source.freshnessStatus))throw new Error('invalid_freshness');
  if(!VALID_SCOPE.has(raw.roadScope))throw new Error('invalid_road_scope');
  if(!VALID_FOCUS.has(raw.focusType))throw new Error('invalid_focus_type');

  const timeStart=parseClock(raw.timeStart);
  const timeEnd=parseClock(raw.timeEnd);
  if(timeEnd<=timeStart&&timeEnd!==1440)throw new Error('invalid_time_window');
  const speed=parseSpeed(raw.speedLimitText);
  const pair=endpoints[raw.externalId];
  const geoPrecision=start&&end?'EXACT_SEGMENT':'ROAD_AREA';
  const displayMode=geoPrecision==='EXACT_SEGMENT'?'EXACT_SEGMENT_TIMED':'ROAD_AREA_TIMED';

  return Object.freeze({
    eventKey:source.sourceKey+':'+raw.externalId,
    sourceKey:source.sourceKey,
    sourceVersionDate:source.sourceVersionDate,
    parserVersion:source.parserVersion,
    prefectureCode:source.prefectureCode,
    policeOrg:source.policeOrg,
    stationName:source.stationName,
    infoType:'SPEED_FOCUS',
    enforcementType:'速度取締重点',
    focusType:raw.focusType,
    routeName,
    segmentStartText:start||null,
    segmentEndText:end||null,
    ...speed,
    roadScope:raw.roadScope,
    timeStartMinutes:timeStart,
    timeEndMinutes:timeEnd,
    timePrecision:'EXACT_TIME',
    geoPrecision,
    displayMode,
    sourceUrl:source.sourceUrl,
    sourceIndexUrl:source.sourceIndexUrl,
    sourceVerifiedAt:source.verifiedAt,
    freshnessStatus:source.freshnessStatus,
    scheduleChangeNote:'実際の取締実施中を示すものではありません。',
    routeEndpoints:pair?Object.freeze([pair.start,pair.end]):null,
    geometryStatus:pair?'ENDPOINTS_CANDIDATE':'UNRESOLVED',
    geometryVerified:false,
    note:text(raw.note)||null
  });
}

export function publicationGate(bundle,{mode='preview'}={}){
  const reasons=[];
  if(bundle?.source?.freshnessStatus!=='CURRENT')reasons.push('source_not_current');
  if(!Array.isArray(bundle?.records)||bundle.records.length===0)reasons.push('no_records');
  if(mode==='production'&&bundle?.source?.termsStatus!=='ALLOWED')reasons.push('terms_not_allowed');
  return Object.freeze({publishable:reasons.length===0,reasons:Object.freeze(reasons)});
}

export function buildSnapshot(bundle,{mode='preview'}={}){
  if(!bundle?.source||!Array.isArray(bundle.records))throw new Error('invalid_bundle');
  const gate=publicationGate(bundle,{mode});
  if(!gate.publishable){
    return Object.freeze({
      schemaVersion:bundle.schemaVersion||1,
      sourceKey:bundle.source.sourceKey,
      sourceVersionDate:bundle.source.sourceVersionDate,
      sourceHash:sourceHash(bundle),
      generatedFrom:'verified_source_rows',
      gate,
      events:Object.freeze([])
    });
  }
  const events=bundle.records.map(row=>normalizeRecord(bundle.source,row,bundle.geometryCandidates||{}));
  const keys=new Set();
  for(const event of events){
    if(keys.has(event.eventKey))throw new Error('duplicate_event:'+event.eventKey);
    keys.add(event.eventKey);
  }
  return Object.freeze({
    schemaVersion:bundle.schemaVersion||1,
    sourceKey:bundle.source.sourceKey,
    sourceVersionDate:bundle.source.sourceVersionDate,
    sourceHash:sourceHash(bundle),
    generatedFrom:'verified_source_rows',
    gate,
    events:Object.freeze(events)
  });
}
