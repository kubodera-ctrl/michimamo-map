'use strict';

const HOUR=60*60*1000;
const DAY=24*HOUR;

const PROFILES=new Set([
  'DAILY_NEXTDAY','WEEKLY_FRIDAY','ROLLING_10DAY','HALF_MONTH',
  'OPEN_DATA_HALF_MONTH','MONTHLY_BOUNDARY','MONTHLY_ADVANCE','MONTHLY_SPOT',
  'HALF_YEAR','ANNUAL_CHANGE_DETECT','HTML_CHANGE_DETECT','HALF_MONTH_SPOT',
  'AD_HOC_SPOT','PREFECTURE_POLICY','SOURCE_STALE_AWARE'
]);

function date(value){
  const d=value instanceof Date?new Date(value):new Date(value);
  if(Number.isNaN(d.getTime()))throw new Error('invalid_date');
  return d;
}

function tokyoParts(value){
  const d=date(value);
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'
  }).formatToParts(d);
  const get=type=>parts.find(x=>x.type===type)?.value;
  return Object.freeze({
    year:Number(get('year')),
    month:Number(get('month')),
    day:Number(get('day')),
    hour:Number(get('hour')),
    minute:Number(get('minute')),
    weekday:get('weekday')
  });
}

function hoursUntil(value,now){
  if(!value)return null;
  return (date(value).getTime()-date(now).getTime())/HOUR;
}

function inHalfMonthBoundary(p){
  return (p.day>=13&&p.day<=17)||p.day>=28||p.day<=2;
}

function inHalfYearBoundary(p){
  return (p.month===6&&p.day>=15)||(p.month===7&&p.day<=10)||
    (p.month===12&&p.day>=15)||(p.month===1&&p.day<=10);
}

function inAnnualBoundary(p){
  return (p.month===3&&p.day>=20)||(p.month===4&&p.day<=15);
}

export function intervalMs(profileId,now=new Date(),state={}){
  if(!PROFILES.has(profileId))throw new Error('unknown_poll_profile');
  const p=tokyoParts(now);

  switch(profileId){
    case 'DAILY_NEXTDAY':
      return p.hour>=6&&p.hour<21?HOUR:2*HOUR;
    case 'WEEKLY_FRIDAY': {
      const accelerated=(p.weekday==='Thu'&&p.hour>=12)||p.weekday==='Fri'||(p.weekday==='Sat'&&p.hour<12);
      return accelerated?2*HOUR:12*HOUR;
    }
    case 'ROLLING_10DAY': {
      const h=hoursUntil(state.periodEnd,now);
      return h!==null&&h<=48&&h>=-24?3*HOUR:12*HOUR;
    }
    case 'HALF_MONTH':
      return inHalfMonthBoundary(p)?3*HOUR:24*HOUR;
    case 'OPEN_DATA_HALF_MONTH':
      return inHalfMonthBoundary(p)?2*HOUR:12*HOUR;
    case 'MONTHLY_BOUNDARY':
      return p.day>=27||p.day<=3?4*HOUR:24*HOUR;
    case 'MONTHLY_ADVANCE':
      return p.day>=15?4*HOUR:24*HOUR;
    case 'MONTHLY_SPOT':
      return p.day>=26||p.day<=3?3*HOUR:12*HOUR;
    case 'HALF_YEAR':
      return inHalfYearBoundary(p)?24*HOUR:7*DAY;
    case 'ANNUAL_CHANGE_DETECT':
      return inAnnualBoundary(p)?24*HOUR:7*DAY;
    case 'HTML_CHANGE_DETECT': {
      const acceleratedUntil=state.acceleratedUntil?date(state.acceleratedUntil).getTime():0;
      return acceleratedUntil>=date(now).getTime()?6*HOUR:24*HOUR;
    }
    case 'HALF_MONTH_SPOT':
      return inHalfMonthBoundary(p)?2*HOUR:12*HOUR;
    case 'AD_HOC_SPOT':
      return 6*HOUR;
    case 'PREFECTURE_POLICY':
      return p.day>=27||p.day<=3?6*HOUR:24*HOUR;
    case 'SOURCE_STALE_AWARE':
      return state.freshnessStatus==='AGING'||state.freshnessStatus==='UNKNOWN'?6*HOUR:24*HOUR;
    default:
      throw new Error('unknown_poll_profile');
  }
}

function stableJitterMs(sourceKey,interval){
  const key=String(sourceKey||'');
  let hash=2166136261;
  for(const ch of key){
    hash^=ch.codePointAt(0);
    hash=Math.imul(hash,16777619)>>>0;
  }
  const max=Math.min(15*60*1000,Math.floor(interval*0.08));
  if(max<=0)return 0;
  return hash%(max+1);
}

export function nextCheckAt(source,now=new Date()){
  if(!source||!source.sourceKey||!source.pollProfileId)throw new Error('invalid_source_schedule');
  const base=intervalMs(source.pollProfileId,now,source);
  const jitter=stableJitterMs(source.sourceKey,base);
  return new Date(date(now).getTime()+base+jitter).toISOString();
}

export function claimDueSources(sources,now=new Date(),{limit=20,allowPending=false}={}){
  if(!Array.isArray(sources))throw new Error('sources_required');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('invalid_claim_limit');
  const nowMs=date(now).getTime();
  return sources
    .filter(source=>source&&source.active!==false&&source.automatedFetchAllowed===true)
    .filter(source=>source.termsStatus==='ALLOWED'||(allowPending&&source.termsStatus==='PENDING'))
    .filter(source=>source.nextCheckAt&&date(source.nextCheckAt).getTime()<=nowMs)
    .sort((a,b)=>date(a.nextCheckAt)-date(b.nextCheckAt)||String(a.sourceKey).localeCompare(String(b.sourceKey)))
    .slice(0,limit)
    .map(source=>Object.freeze({...source}));
}

export function scheduleAfterFetch(source,result,now=new Date()){
  if(!source||!result)throw new Error('schedule_result_required');
  const failures=Number(source.consecutiveFailures||0);
  if(result.status==='error'){
    const backoff=Math.min(24*HOUR,Math.max(HOUR,2**Math.min(failures,5)*HOUR));
    return Object.freeze({
      nextCheckAt:new Date(date(now).getTime()+backoff+stableJitterMs(source.sourceKey,backoff)).toISOString(),
      consecutiveFailures:failures+1
    });
  }
  return Object.freeze({
    nextCheckAt:nextCheckAt({...source,consecutiveFailures:0},now),
    consecutiveFailures:0
  });
}

export const POLL_PROFILES=Object.freeze([...PROFILES]);
