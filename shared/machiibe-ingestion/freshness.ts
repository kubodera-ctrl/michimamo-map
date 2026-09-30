export const CONTENT_FRESHNESS_STATES=['unknown','fresh','stale','expired'] as const;
export type ContentFreshnessState=typeof CONTENT_FRESHNESS_STATES[number];

export type FreshnessContractSnapshot={
  sourceUpdatedAt:string|null;
  resourceUpdatedAt:string|null;
  eventUpdatedAt:string|null;
  firstSeenAt:string|null;
  lastSeenAt:string|null;
  lastCheckedAt:string|null;
  nextCheckAt:string|null;
  contentFreshness:ContentFreshnessState;
};

function time(value:string|null){
  if(!value)return null;
  const parsed=Date.parse(value);
  return Number.isFinite(parsed)?parsed:null;
}

export function freshnessContractBlockers(snapshot:FreshnessContractSnapshot){
  const blockers:string[]=[];
  if(!snapshot.lastCheckedAt)blockers.push('last_checked_at');
  if(snapshot.contentFreshness!=='fresh')blockers.push('content_freshness');
  // A fresh catalog/resource timestamp alone is not event-freshness evidence.
  if(!snapshot.eventUpdatedAt&&!snapshot.lastSeenAt)blockers.push('event_freshness_evidence');
  const first=time(snapshot.firstSeenAt),last=time(snapshot.lastSeenAt);
  if(first!==null&&last!==null&&first>last)blockers.push('seen_window_invalid');
  const checked=time(snapshot.lastCheckedAt),next=time(snapshot.nextCheckAt);
  if(checked!==null&&next!==null&&next<checked)blockers.push('next_check_invalid');
  return blockers;
}

export function freshnessContractPasses(snapshot:FreshnessContractSnapshot){
  return freshnessContractBlockers(snapshot).length===0;
}
