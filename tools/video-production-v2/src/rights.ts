import type {MachimamoVideoProps} from './types';

const allowedRights=new Set(['SELF_OWNED','EXPLICIT_PERMISSION','PUBLIC_LICENSE','CC_BY','PUBLIC_DOMAIN']);
const forbiddenModes=new Set(['LINK_ONLY','DO_NOT_USE','STILL_ONLY']);

export type RightsDecision={
  renderAllowed:boolean;
  publishEligible:boolean;
  requiresHumanReview:boolean;
  reasons:string[];
};

export const evaluateRights=(p:MachimamoVideoProps):RightsDecision=>{
  const reasons:string[]=[];
  let renderAllowed=true;
  let publishEligible=true;
  let requiresHumanReview=false;

  if(p.rightsLevel==='BLOCKED'){
    renderAllowed=false; publishEligible=false; reasons.push('rightsLevel=BLOCKED');
  }else if(p.rightsLevel==='REVIEW'){
    publishEligible=false; requiresHumanReview=true; reasons.push('rightsLevel=REVIEW');
  }else if(!allowedRights.has(p.rightsLevel)){
    renderAllowed=false; publishEligible=false; reasons.push('rightsLevel not approved');
  }
  if(p.mediaUseMode.some((m)=>forbiddenModes.has(m))){
    renderAllowed=false; publishEligible=false; reasons.push('mediaUseMode forbids moving-video render');
  }
  if(!p.commercialUseAllowed){
    renderAllowed=false; publishEligible=false; reasons.push('commercial use not confirmed');
  }
  if(!p.modificationAllowed){
    renderAllowed=false; publishEligible=false; reasons.push('modification/reframing not allowed');
  }
  if(!p.sourceUiFree){
    renderAllowed=false; publishEligible=false; reasons.push('source contains social-platform UI');
  }
  if(p.attributionRequired&&!p.attributionText){
    renderAllowed=false; publishEligible=false; reasons.push('required attribution missing');
  }

  const totalUsable=p.media.reduce((sum,m)=>sum+(m.useDurationSeconds??m.durationSeconds),0);
  if(p.format==='long'&&p.media.length<2&&totalUsable<25){
    publishEligible=false; requiresHumanReview=true;
    reasons.push('long version has low visual variety');
  }
  return {renderAllowed,publishEligible,requiresHumanReview,reasons};
};
