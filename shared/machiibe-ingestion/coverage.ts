export type SourceReviewState =
  | 'DISCOVERED'
  | 'PREFLIGHT'
  | 'TERMS_REVIEWED'
  | 'ROBOTS_REVIEWED'
  | 'READY'
  | 'ACTIVE'
  | 'BLOCKED';

export type CoverageSource = {
  sourceId:string;
  prefecture:string|null;
  reviewState:SourceReviewState;
  failureCount:number;
  observedCurrentItemsMin?:number|null;
  lane?:'regional'|'open_data'|'facility'|'oshi';
};

export type CoverageEvent = {
  eventId:string;
  prefecture:string;
  startDate:string;
  endDate:string;
  status:'scheduled'|'changed'|'postponed'|'cancelled'|'expired';
  imageUsable:boolean;
  sourceIds:string[];
};

export type PrefectureCoverageRow = {
  prefecture:string;
  candidateSources:number;
  readySources:number;
  activeSources:number;
  activeEvents:number;
  next30DaysEvents:number;
  imageUsableEvents:number;
  imageMissingEvents:number;
  sourceFailures:number;
  duplicateMerged:number;
  observedPotentialEventsMin:number;
  facilitySources:number;
  oshiSources:number;
};

const DAY=86_400_000;
const iso=/^\d{4}-\d{2}-\d{2}$/;

function dateValue(value:string){
  if(!iso.test(value)) throw new Error('invalid ISO date: '+value);
  return Date.parse(value+'T00:00:00Z');
}

function plusDays(value:string,days:number){
  return new Date(dateValue(value)+days*DAY).toISOString().slice(0,10);
}

function eventIsLive(event:CoverageEvent,today:string){
  return event.endDate>=today && event.status!=='cancelled' && event.status!=='expired';
}

function eventOverlaps(event:CoverageEvent,from:string,to:string){
  return event.startDate<=to && event.endDate>=from;
}

export function summarizePrefectureCoverage(
  prefectures:string[],
  sources:CoverageSource[],
  events:CoverageEvent[],
  today:string
):PrefectureCoverageRow[]{
  dateValue(today);
  const to=plusDays(today,29);
  return prefectures.map((prefecture)=>{
    const sourceRows=sources.filter((source)=>source.prefecture===prefecture);
    const eventRows=events.filter((event)=>event.prefecture===prefecture);
    const live=eventRows.filter((event)=>eventIsLive(event,today));
    return {
      prefecture,
      candidateSources:sourceRows.filter((source)=>source.reviewState!=='BLOCKED').length,
      readySources:sourceRows.filter((source)=>source.reviewState==='READY'||source.reviewState==='ACTIVE').length,
      activeSources:sourceRows.filter((source)=>source.reviewState==='ACTIVE').length,
      activeEvents:live.length,
      next30DaysEvents:live.filter((event)=>eventOverlaps(event,today,to)).length,
      imageUsableEvents:live.filter((event)=>event.imageUsable).length,
      imageMissingEvents:live.filter((event)=>!event.imageUsable).length,
      sourceFailures:sourceRows.reduce((sum,source)=>sum+Math.max(0,source.failureCount||0),0),
      duplicateMerged:eventRows.reduce((sum,event)=>sum+Math.max(0,new Set(event.sourceIds).size-1),0),
      facilitySources:sourceRows.filter((source)=>source.lane==='facility').length,
      oshiSources:sourceRows.filter((source)=>source.lane==='oshi').length,
      // Research-only lower bound from source pages. This is NOT an ingested,
      // deduplicated or currently valid event count and must never be reported
      // as activeEvents/next30DaysEvents.
      observedPotentialEventsMin:sourceRows
        .filter((source)=>source.reviewState!=='BLOCKED')
        .reduce((sum,source)=>sum+Math.max(0,source.observedCurrentItemsMin||0),0)
    };
  });
}

export function rankCoverageGaps(rows:PrefectureCoverageRow[]){
  return [...rows].sort((a,b)=>{
    const aZero=a.activeEvents===0?0:1;
    const bZero=b.activeEvents===0?0:1;
    if(aZero!==bZero) return aZero-bZero;
    if(a.activeEvents!==b.activeEvents) return a.activeEvents-b.activeEvents;
    if(a.readySources!==b.readySources) return a.readySources-b.readySources;
    if(a.candidateSources!==b.candidateSources) return a.candidateSources-b.candidateSources;
    return a.prefecture.localeCompare(b.prefecture,'ja');
  });
}


export type CoverageWeaknessReason=
  | 'no_active_events'
  | 'single_source'
  | 'low_observed_potential'
  | 'no_ready_source'
  | 'facility_gap'
  | 'oshi_gap';

export function coverageWeaknessReasons(
  row:PrefectureCoverageRow,
  options:{minCandidateSources?:number;minObservedPotentialEvents?:number}={}
):CoverageWeaknessReason[]{
  const minCandidateSources=options.minCandidateSources??2;
  const minObservedPotentialEvents=options.minObservedPotentialEvents??20;
  const reasons:CoverageWeaknessReason[]=[];
  if(row.activeEvents===0)reasons.push('no_active_events');
  if(row.candidateSources<minCandidateSources)reasons.push('single_source');
  if(row.observedPotentialEventsMin<minObservedPotentialEvents)reasons.push('low_observed_potential');
  if(row.readySources===0)reasons.push('no_ready_source');
  if(row.facilitySources===0)reasons.push('facility_gap');
  if(row.oshiSources===0)reasons.push('oshi_gap');
  return reasons;
}

export function rankWeakPrefectureCoverage(rows:PrefectureCoverageRow[]){
  return [...rows].sort((a,b)=>{
    const ar=coverageWeaknessReasons(a).length;
    const br=coverageWeaknessReasons(b).length;
    if(ar!==br)return br-ar;
    if(a.activeEvents!==b.activeEvents)return a.activeEvents-b.activeEvents;
    if(a.observedPotentialEventsMin!==b.observedPotentialEventsMin)return a.observedPotentialEventsMin-b.observedPotentialEventsMin;
    return a.prefecture.localeCompare(b.prefecture,'ja');
  });
}
