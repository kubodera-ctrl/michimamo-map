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
