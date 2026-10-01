export type SearchGapDimension={
  prefecture:string|null;
  municipality:string|null;
  entityKeys:string[];
  eventTypes:string[];
  dateMode:'today'|'tomorrow'|'weekend'|'30days'|'custom'|null;
};

export type SearchGapSignal={
  dimension:SearchGapDimension;
  searches:number;
  zeroResultSearches:number;
  lowResultSearches:number;
  resultCountSum:number;
  lastSeenAt:string;
};

export function searchGapKey(dimension:SearchGapDimension){
  return JSON.stringify({
    prefecture:dimension.prefecture||null,
    municipality:dimension.municipality||null,
    entityKeys:[...new Set(dimension.entityKeys)].sort(),
    eventTypes:[...new Set(dimension.eventTypes)].sort(),
    dateMode:dimension.dateMode||null
  });
}

export function sourceDiscoveryDemandScore(signal:SearchGapSignal){
  if(signal.searches<=0)return 0;
  const zeroRate=signal.zeroResultSearches/signal.searches;
  const lowRate=signal.lowResultSearches/signal.searches;
  const avg=signal.resultCountSum/signal.searches;
  return Math.round((
    Math.min(20,Math.log2(signal.searches+1)*4)
    + zeroRate*40
    + lowRate*15
    + Math.max(0,10-Math.min(10,avg))
  )*10)/10;
}

export function shouldEscalateSourceDiscovery(signal:SearchGapSignal){
  return signal.searches>=3
    && (signal.zeroResultSearches>=2||sourceDiscoveryDemandScore(signal)>=30);
}
