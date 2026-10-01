export type SourcePriorityInput={
  observedPotentialEventsMin:number|null;
  prefectureGap:boolean;
  regionCoverage:'facility'|'municipality'|'prefecture'|'multi_prefecture'|'national';
  categoryBreadth:'low'|'medium'|'high'|'very_high';
  familyRelevance:'low'|'medium'|'high';
  acquisitionDifficulty:'low'|'medium'|'high';
  termsDifficulty:'low'|'medium'|'high'|'unknown';
  maintenanceCost:'low'|'medium'|'high';
  freshnessConfidence:'low'|'medium'|'high';
};

const coverageWeight={facility:1,municipality:2,prefecture:4,multi_prefecture:6,national:8} as const;
const breadthWeight={low:0,medium:2,high:4,very_high:6} as const;
const relevanceWeight={low:0,medium:2,high:4} as const;
const penalty={low:0,medium:2,high:5} as const;
const freshnessWeight={low:0,medium:2,high:4} as const;

export function scoreSourcePriority(input:SourcePriorityInput){
  const potential=Math.min(20,Math.log2(Math.max(1,input.observedPotentialEventsMin||1))*2);
  const gap=input.prefectureGap?8:0;
  const termsPenalty=input.termsDifficulty==='unknown'?4:penalty[input.termsDifficulty];
  return Math.round((
    potential
    + gap
    + coverageWeight[input.regionCoverage]
    + breadthWeight[input.categoryBreadth]
    + relevanceWeight[input.familyRelevance]
    + freshnessWeight[input.freshnessConfidence]
    - penalty[input.acquisitionDifficulty]
    - termsPenalty
    - penalty[input.maintenanceCost]
  )*10)/10;
}

export function rankSourcePriority<T extends SourcePriorityInput>(rows:T[]){
  return [...rows].sort((a,b)=>scoreSourcePriority(b)-scoreSourcePriority(a));
}
