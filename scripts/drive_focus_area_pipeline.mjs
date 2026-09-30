import crypto from 'node:crypto';

const INFO_TYPES=new Set(['INTERSECTION_FOCUS','DRINK_FOCUS','SCHOOL_ROUTE_FOCUS']);
const TIME_PRECISIONS=new Set(['EXACT_TIME','POLICY','DAYPART']);
const GEO_PRECISIONS=new Set(['LOCALITY','ROAD_AREA']);
const DISPLAY_MODES=new Set(['AREA_FOCUS']);

function clean(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function parseClock(value){
  const v=clean(value),m=/^(\d{1,2}):(\d{2})$/.exec(v);
  if(!m)throw new Error('invalid_time:'+v);
  const h=Number(m[1]),min=Number(m[2]);
  if(h<0||h>24||min<0||min>59||(h===24&&min!==0))throw new Error('invalid_time:'+v);
  return h*60+min;
}

export function sourceHash(bundle){
  return crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
}

export function normalizeFocusRecord(source,raw){
  if(!raw?.externalId||!INFO_TYPES.has(raw.infoType))throw new Error('invalid_focus_identity');
  if(!TIME_PRECISIONS.has(raw.timePrecision))throw new Error('invalid_time_precision');
  if(!GEO_PRECISIONS.has(raw.geoPrecision))throw new Error('invalid_geo_precision');
  if(!DISPLAY_MODES.has(raw.displayMode))throw new Error('invalid_display_mode');

  const enforcementType=clean(raw.enforcementType);
  const localityText=clean(raw.localityText);
  if(!enforcementType||!localityText)throw new Error('focus_text_required');

  let timeStartMinutes=null,timeEndMinutes=null,timeText=clean(raw.timeText)||null;
  if(raw.timePrecision==='EXACT_TIME'){
    timeStartMinutes=parseClock(raw.timeStart);
    timeEndMinutes=parseClock(raw.timeEnd);
    if(timeEndMinutes<=timeStartMinutes&&timeEndMinutes!==1440)throw new Error('invalid_time_window');
    timeText=null;
  }else if(!timeText){
    throw new Error('focus_time_text_required');
  }

  return Object.freeze({
    eventKey:source.sourceKey+':'+raw.externalId,
    externalId:raw.externalId,
    sourceRecordKey:clean(raw.sourceRecordKey)||raw.externalId,
    sourceKey:source.sourceKey,
    sourceVersionDate:source.sourceVersionDate||null,
    prefectureCode:source.prefectureCode,
    policeOrg:source.policeOrg,
    stationName:source.stationName||null,
    infoType:raw.infoType,
    enforcementType,
    localityText,
    timePrecision:raw.timePrecision,
    timeStartMinutes,
    timeEndMinutes,
    timeText,
    geoPrecision:raw.geoPrecision,
    displayMode:raw.displayMode,
    sourceUrl:source.sourceUrl,
    sourceVerifiedAt:source.verifiedAt,
    freshnessStatus:source.freshnessStatus,
    scheduleChangeNote:'公式の重点時間・重点場所を示すもので、現在の取締実施や検問位置を示すものではありません。'
  });
}

export function publicationGate(bundle,{mode='preview'}={}){
  const reasons=[];
  if(bundle?.source?.freshnessStatus!=='CURRENT')reasons.push('source_not_current');
  if(!Array.isArray(bundle?.records)||bundle.records.length===0)reasons.push('no_records');
  if(mode==='production'&&bundle?.source?.termsStatus!=='ALLOWED')reasons.push('terms_not_allowed');
  return Object.freeze({publishable:reasons.length===0,reasons:Object.freeze(reasons)});
}

export function buildFocusSnapshot(bundle,{mode='preview'}={}){
  if(!bundle?.source||bundle.source.sourceFamily!=='AREA_FOCUS'||!Array.isArray(bundle.records))throw new Error('invalid_focus_bundle');
  const gate=publicationGate(bundle,{mode});
  const hash=sourceHash(bundle);
  if(!gate.publishable){
    return Object.freeze({
      schemaVersion:1,
      sourceKey:bundle.source.sourceKey,
      sourceHash:hash,
      gate,
      events:Object.freeze([])
    });
  }

  const events=bundle.records.map(row=>normalizeFocusRecord(bundle.source,row));
  const keys=new Set();
  for(const event of events){
    if(keys.has(event.eventKey))throw new Error('duplicate_focus_event');
    keys.add(event.eventKey);
  }

  return Object.freeze({
    schemaVersion:1,
    sourceKey:bundle.source.sourceKey,
    sourceVersionDate:bundle.source.sourceVersionDate||null,
    sourceHash:hash,
    gate,
    events:Object.freeze(events)
  });
}
