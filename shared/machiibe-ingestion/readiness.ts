export type ReadySourceAudit={
  sourceKey:string;
  termsAllowed:boolean;
  robotsOrApiPolicyClear:boolean;
  resourceResolved:boolean;
  commercialAllowed:boolean;
  reuseAllowed:boolean;
  attributionKnown:boolean;
  freshnessAcceptable:boolean;
  thirdPartyRightsSeparated:boolean;
};

export function readySourceBlockers(audit:ReadySourceAudit){
  const blockers:string[]=[];
  if(!audit.termsAllowed) blockers.push('terms');
  if(!audit.robotsOrApiPolicyClear) blockers.push('robots_or_api_policy');
  if(!audit.resourceResolved) blockers.push('resource');
  if(!audit.commercialAllowed) blockers.push('commercial_use');
  if(!audit.reuseAllowed) blockers.push('reuse');
  if(!audit.attributionKnown) blockers.push('attribution');
  if(!audit.freshnessAcceptable) blockers.push('freshness');
  if(!audit.thirdPartyRightsSeparated) blockers.push('third_party_rights');
  return blockers;
}

export function isReadySource(audit:ReadySourceAudit){
  return readySourceBlockers(audit).length===0;
}
