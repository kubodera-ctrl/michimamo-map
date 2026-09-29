export type EventFunnelStage='Potential'|'Fetched'|'Normalized'|'Deduped'|'Valid'|'Publishable'|'Active';

export type EventFunnelCounts={
  potential:number;
  fetched:number;
  normalized:number;
  deduped:number;
  valid:number;
  publishable:number;
  active:number;
};

export function validateEventFunnelCounts(counts:EventFunnelCounts){
  const values=[
    counts.potential,counts.fetched,counts.normalized,counts.deduped,
    counts.valid,counts.publishable,counts.active
  ];
  if(values.some((value)=>!Number.isInteger(value)||value<0)) return false;
  return counts.potential>=counts.fetched
    && counts.fetched>=counts.normalized
    && counts.normalized>=counts.deduped
    && counts.deduped>=counts.valid
    && counts.valid>=counts.publishable
    && counts.publishable>=counts.active;
}

export function emptyEventFunnelCounts(potential=0):EventFunnelCounts{
  if(!Number.isInteger(potential)||potential<0) throw new Error('potential must be a non-negative integer');
  return {potential,fetched:0,normalized:0,deduped:0,valid:0,publishable:0,active:0};
}

export function eventFunnelDropoff(counts:EventFunnelCounts){
  if(!validateEventFunnelCounts(counts)) throw new Error('invalid event funnel counts');
  return {
    fetchLoss:counts.potential-counts.fetched,
    normalizeLoss:counts.fetched-counts.normalized,
    dedupeMerged:counts.normalized-counts.deduped,
    invalid:counts.deduped-counts.valid,
    rightsOrSourceBlocked:counts.valid-counts.publishable,
    notActivated:counts.publishable-counts.active
  };
}
