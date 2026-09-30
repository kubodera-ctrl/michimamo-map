import {
  duplicateConfidence,duplicateReviewRequired,duplicateSignals,type DedupeComparable
} from './contracts';

export type CrossSourceCandidate=DedupeComparable&{
  candidateId:string;
  sourceId:number;
};

export type DedupePair={
  leftId:string;
  rightId:string;
  leftSourceId:number;
  rightSourceId:number;
  confidence:number;
};

export type CrossSourceDedupeResult={
  inputCount:number;
  autoMergePairs:DedupePair[];
  reviewPairs:DedupePair[];
  clusters:string[][];
  uniqueAfterAutoMerge:number;
};

class UnionFind{
  private parent=new Map<string,string>();
  add(id:string){if(!this.parent.has(id))this.parent.set(id,id);}
  find(id:string):string{
    const p=this.parent.get(id);
    if(!p){this.parent.set(id,id);return id;}
    if(p===id)return id;
    const root=this.find(p);this.parent.set(id,root);return root;
  }
  union(a:string,b:string){
    const ra=this.find(a),rb=this.find(b);
    if(ra!==rb)this.parent.set(rb,ra);
  }
}

function pairKey(a:CrossSourceCandidate,b:CrossSourceCandidate){
  return a.candidateId<b.candidateId?[a,b]:[b,a];
}

export function dedupeCrossSourceCandidates(
  candidates:CrossSourceCandidate[],
  options:{reviewThreshold?:number;autoMergeThreshold?:number}={}
):CrossSourceDedupeResult{
  const reviewThreshold=options.reviewThreshold??0.75;
  const autoMergeThreshold=options.autoMergeThreshold??0.97;
  if(reviewThreshold<0||autoMergeThreshold>1||reviewThreshold>=autoMergeThreshold){
    throw new Error('invalid dedupe thresholds');
  }

  const uf=new UnionFind();
  for(const row of candidates)uf.add(row.candidateId);
  const autoMergePairs:DedupePair[]=[];
  const reviewPairs:DedupePair[]=[];

  for(let i=0;i<candidates.length;i++){
    const a=candidates[i];
    for(let j=i+1;j<candidates.length;j++){
      const b=candidates[j];
      if(a.sourceId===b.sourceId)continue;
      if(a.municipality&&b.municipality&&a.municipality!==b.municipality)continue;

      const confidence=duplicateConfidence(duplicateSignals(a,b));
      if(confidence<reviewThreshold)continue;
      const [left,right]=pairKey(a,b);
      const pair:DedupePair={
        leftId:left.candidateId,rightId:right.candidateId,
        leftSourceId:left.sourceId,rightSourceId:right.sourceId,
        confidence
      };
      if(confidence>=autoMergeThreshold&&!duplicateReviewRequired(confidence)){
        autoMergePairs.push(pair);
        uf.union(left.candidateId,right.candidateId);
      }else{
        reviewPairs.push(pair);
      }
    }
  }

  const groups=new Map<string,string[]>();
  for(const row of candidates){
    const root=uf.find(row.candidateId);
    const list=groups.get(root)||[];
    list.push(row.candidateId);
    groups.set(root,list);
  }
  const clusters=[...groups.values()]
    .filter((items)=>items.length>1)
    .map((items)=>items.slice().sort());

  return {
    inputCount:candidates.length,
    autoMergePairs,
    reviewPairs,
    clusters,
    uniqueAfterAutoMerge:groups.size
  };
}
