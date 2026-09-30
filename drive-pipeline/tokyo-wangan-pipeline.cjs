'use strict';

const crypto=require('node:crypto');

function text(value){
  return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();
}
function parseSpeed(value){
  const normalized=text(value);
  const values=[...normalized.matchAll(/(\d+)\s*km/gi)].map(m=>Number(m[1]));
  if(!values.length)throw new Error('speed_missing');
  return {speedLimitKmh:values[0],speedLimitText:normalized,alternateSpeedKmh:values.slice(1)};
}
function parseWindow(value){
  const normalized=text(value).replace(/[–—−ー]/g,'-');
  const match=normalized.match(/^(\d{1,2})-(\d{1,2})$/);
  if(!match)throw new Error('invalid_time_window');
  const startHour=Number(match[1]),endHour=Number(match[2]);
  if(startHour<0||startHour>23||endHour<0||endHour>23)throw new Error('invalid_time_hour');
  const startMinute=startHour*60;
  const endMinute=endHour===0&&startHour>0?1440:endHour*60;
  if(endMinute!==1440&&endMinute<=startMinute)throw new Error('overnight_window_not_supported');
  return {startMinute,endMinute,timeStart:String(startHour).padStart(2,'0')+':00',timeEnd:endMinute===1440?'24:00':String(endHour).padStart(2,'0')+':00'};
}
function stableEventId(sourceId,row){
  return sourceId+'-'+String(row.no).padStart(2,'0');
}
function normalizeRow(source,row){
  if(!Number.isInteger(row.no)||row.no<1)throw new Error('invalid_row_no');
  const route=text(row.route),start=text(row.start),end=text(row.end);
  if(!route||!start||!end)throw new Error('location_missing');
  const speed=parseSpeed(row.speedText);
  const window=parseWindow(row.time);
  return Object.freeze({
    eventId:stableEventId(source.sourceId,row),
    sourceId:source.sourceId,
    sourceUrl:source.sourcePdf,
    sourceVerifiedAt:source.verifiedAt,
    agency:source.agency,
    policeStation:source.policeStation,
    infoType:'SPEED_FOCUS',
    routeName:route,
    enforcementClass:row.kind==='☆'?'METROPOLITAN_FOCUS':'STATION_FOCUS',
    segmentStartText:start,
    segmentEndText:end,
    ...speed,
    ...window,
    geoPrecision:'EXACT_SEGMENT',
    timePrecision:'EXACT_TIME',
    displayMode:'EXACT_SEGMENT_TIMED',
    freshnessStatus:source.freshnessStatus,
    isOfficial:true
  });
}
function sourceHash(input){
  const canonical=JSON.stringify({source:input.source,rows:input.rows});
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
function normalizeSource(input){
  if(!input||!input.source||!Array.isArray(input.rows))throw new Error('invalid_source');
  const events=input.rows.map(row=>normalizeRow(input.source,row));
  const ids=new Set(events.map(x=>x.eventId));
  if(ids.size!==events.length)throw new Error('duplicate_event_id');
  return Object.freeze({
    sourceId:input.source.sourceId,
    sourceHash:sourceHash(input),
    sourceIndexUpdatedAt:input.source.sourceIndexUpdatedAt,
    verifiedAt:input.source.verifiedAt,
    freshnessStatus:input.source.freshnessStatus,
    termsStatus:input.source.termsStatus,
    events:Object.freeze(events)
  });
}
function publicationGate(normalized,{mode='production'}={}){
  const reasons=[];
  if(normalized.freshnessStatus!=='CURRENT')reasons.push('source_not_current');
  if(!normalized.events.length)reasons.push('no_events');
  if(normalized.events.some(x=>x.geoPrecision!=='EXACT_SEGMENT'||x.timePrecision!=='EXACT_TIME'))reasons.push('precision_invalid');
  if(mode==='production'&&normalized.termsStatus!=='ALLOWED')reasons.push('terms_not_allowed');
  return Object.freeze({publishable:reasons.length===0,reasons});
}
function publicSnapshot(normalized,{mode='preview'}={}){
  const gate=publicationGate(normalized,{mode});
  if(!gate.publishable)return Object.freeze({sourceId:normalized.sourceId,sourceHash:normalized.sourceHash,verifiedAt:normalized.verifiedAt,events:[],gate});
  const events=normalized.events.map(x=>Object.freeze({
    eventId:x.eventId,
    sourceId:x.sourceId,
    sourceUrl:x.sourceUrl,
    sourceVerifiedAt:x.sourceVerifiedAt,
    agency:x.agency,
    policeStation:x.policeStation,
    infoType:x.infoType,
    routeName:x.routeName,
    enforcementClass:x.enforcementClass,
    segmentStartText:x.segmentStartText,
    segmentEndText:x.segmentEndText,
    speedLimitKmh:x.speedLimitKmh,
    speedLimitText:x.speedLimitText,
    alternateSpeedKmh:x.alternateSpeedKmh,
    startMinute:x.startMinute,
    endMinute:x.endMinute,
    timeStart:x.timeStart,
    timeEnd:x.timeEnd,
    geoPrecision:x.geoPrecision,
    timePrecision:x.timePrecision,
    displayMode:x.displayMode,
    freshnessStatus:x.freshnessStatus,
    isOfficial:true
  }));
  return Object.freeze({sourceId:normalized.sourceId,sourceHash:normalized.sourceHash,verifiedAt:normalized.verifiedAt,events:Object.freeze(events),gate});
}

module.exports={text,parseSpeed,parseWindow,normalizeRow,normalizeSource,publicationGate,publicSnapshot,sourceHash};
