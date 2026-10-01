import type {NormalizedEventCandidate,SourcePolicySnapshot} from './contracts';
import {validateNormalizedCandidate} from './contracts';

export type SupplyCandidateAssessment={
  normalized:boolean;
  valid:boolean;
  publishable:boolean;
  errors:string[];
};

function hasLocation(candidate:NormalizedEventCandidate){
  return Boolean(candidate.venueName||candidate.address||candidate.municipality||(candidate.lat!==null&&candidate.lng!==null));
}

export function assessSupplyCandidate(
  candidate:NormalizedEventCandidate,
  source:SourcePolicySnapshot,
  today:string
):SupplyCandidateAssessment{
  const errors=[...validateNormalizedCandidate(candidate).errors];
  if(!candidate.startAt) errors.push('start_missing');
  if(!hasLocation(candidate)) errors.push('location_missing');
  if(!candidate.officialUrl) errors.push('official_url_missing');

  const normalized=Boolean(candidate.title&&candidate.sourceUrl);
  const valid=normalized&&errors.length===0;
  const ended=Boolean(candidate.endAt&&candidate.endAt.slice(0,10)<today);
  const blockedStatus=['cancelled','expired'].includes(candidate.status);
  const sourcePublishable=[
    'FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW'
  ].includes(source.sourceStage)
    && source.termsStatus==='reviewed_allowed'
    && source.commercialUseStatus==='allowed'
    && source.reuseStatus==='allowed';

  return {
    normalized,
    valid,
    publishable:valid&&sourcePublishable&&!ended&&!blockedStatus,
    errors
  };
}

export function summarizeSupplyBatch(
  fetched:number,
  candidates:NormalizedEventCandidate[],
  source:SourcePolicySnapshot,
  today:string,
  potential:number
){
  const assessed=candidates.map((candidate)=>assessSupplyCandidate(candidate,source,today));
  return {
    potential,
    fetched,
    normalized:assessed.filter((row)=>row.normalized).length,
    valid:assessed.filter((row)=>row.valid).length,
    publishable:assessed.filter((row)=>row.publishable).length
  };
}
