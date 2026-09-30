import crypto from 'node:crypto';

const VALID_FRESHNESS=new Set(['CURRENT','AGING','STALE','UNKNOWN']);
const VALID_SCOPE=new Set(['SEGMENT','AREA','WHOLE_ROUTE','STATION_AREA','PREFECTURE']);

function text(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}

export function parseClock(value){
  const v=text(value);
  const m=/^(\d{1,2}):(\d{2})$/.exec(v);
  if(!m)throw new Error('invalid_time:'+v);
  const h=Number(m[1]),min=Number(m[2]);
  if((h<0||h>24)||min<0||min>59||(h===24&&min!==0))throw new Error('invalid_time:'+v);
  return h*60+min;
}

export function sourceHash(bundle){
  return crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
}

export function normalizeRecord(source,raw,endpoints={}){
  const routeName=text(raw.routeName),start=text(raw.segmentStartText),end=text(raw.segmentEndText);
  if(!raw.externalId||!routeName)throw new Error('missing_identity');
  if(!VALID_FRESHNESS.has(source.freshnessStatus))throw new Error('invalid_freshness');
  if(!VALID_SCOPE.has(raw.roadScope))throw new Error('invalid_road_scope');

  const timeStart=parseClock(raw.timeStart);
  const timeEnd=parseClock(raw.timeEnd);
  const speedText=text(raw.speedLimitText);
  const speed=/^\d+$/.test(speedText)?Number(speedText):null;
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
    routeName,
    segmentStartText:start||null,
    segmentEndText:end||null,
    speedLimitKmh:speed,
    speedLimitText:speedText||null,
    roadScope:raw.roadScope,
    timeStartMinutes:timeStart,
    timeEndMinutes:timeEnd,
    timePrecision:'EXACT_TIME',
    geoPrecision,
    displayMode,
    sourceUrl:source.sourceUrl,
    sourceIndexUrl:source.sourceIndexUrl,
    sourceVerifiedAt:source.sourceVersionDate,
    freshnessStatus:source.freshnessStatus,
    scheduleChangeNote:'実際の取締実施中を示すものではありません。',
    routeEndpoints:pair?Object.freeze([pair.start,pair.end]):null,
    geometryStatus:pair?'ENDPOINTS_VERIFIED':'UNRESOLVED',
    note:text(raw.note)||null
  });
}

export function buildSnapshot(bundle){
  if(!bundle?.source||!Array.isArray(bundle.records))throw new Error('invalid_bundle');
  if(bundle.source.freshnessStatus!=='CURRENT')return Object.freeze({sourceKey:bundle.source.sourceKey,sourceHash:sourceHash(bundle),events:[]});
  const events=bundle.records.map(row=>normalizeRecord(bundle.source,row,bundle.verifiedEndpointCoordinates||{}));
  const keys=new Set();
  for(const event of events){
    if(keys.has(event.eventKey))throw new Error('duplicate_event:'+event.eventKey);
    keys.add(event.eventKey);
  }
  return Object.freeze({
    schemaVersion:1,
    sourceKey:bundle.source.sourceKey,
    sourceVersionDate:bundle.source.sourceVersionDate,
    sourceHash:sourceHash(bundle),
    generatedFrom:'verified_source_rows',
    events:Object.freeze(events)
  });
}
