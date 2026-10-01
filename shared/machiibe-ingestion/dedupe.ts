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
  reviewReason?:'ambiguous_confidence'|'source_cluster_conflict';
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
  private sources=new Map<string,Set<number>>();

  add(id:string,sourceId:number){
    if(this.parent.has(id))return;
    this.parent.set(id,id);
    this.sources.set(id,new Set([sourceId]));
  }

  find(id:string):string{
    const p=this.parent.get(id);
    if(!p)throw new Error('unknown union-find node: '+id);
    if(p===id)return id;
    const root=this.find(p);this.parent.set(id,root);return root;
  }

  canUnion(a:string,b:string){
    const ra=this.find(a),rb=this.find(b);
    if(ra===rb)return true;
    const left=this.sources.get(ra)||new Set<number>();
    const right=this.sources.get(rb)||new Set<number>();
    for(const sourceId of left)if(right.has(sourceId))return false;
    return true;
  }

  union(a:string,b:string){
    const ra=this.find(a),rb=this.find(b);
    if(ra===rb)return true;
    if(!this.canUnion(a,b))return false;
    const left=this.sources.get(ra)||new Set<number>();
    const right=this.sources.get(rb)||new Set<number>();
    this.parent.set(rb,ra);
    this.sources.set(ra,new Set([...left,...right]));
    this.sources.delete(rb);
    return true;
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
  for(const row of candidates)uf.add(row.candidateId,row.sourceId);
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
        if(uf.union(left.candidateId,right.candidateId)){
          autoMergePairs.push(pair);
        }else{
          reviewPairs.push({...pair,reviewReason:'source_cluster_conflict'});
        }
      }else{
        reviewPairs.push({...pair,reviewReason:'ambiguous_confidence'});
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
