export type SourceEligibilityInput={
  is_active:boolean|null;
  automated_fetch_allowed:boolean|null;
  event_use_allowed?:boolean|null;
  terms_review_status:string|null;
  acquisition_mode:string|null;
  robots_status:string|null;
  commercial_use_status:string|null;
  reuse_status:string|null;
  redistribution_status:string|null;
  cache_status:string|null;
  source_stage:string|null;
  fetch_method:string|null;
  last_terms_checked_at:string|null;
  attribution_requirement:string|null;
  update_frequency_minutes:number|null;
};

export function sourceAutomationBlockers(source:SourceEligibilityInput,nowMs=Date.now()):string[]{
  const blockers:string[]=[];
  if(source.is_active!==true)blockers.push('source_inactive');
  if(source.automated_fetch_allowed!==true)blockers.push('automated_fetch_not_allowed');
  if(source.event_use_allowed!==true)blockers.push('event_use_not_allowed');
  if(source.terms_review_status!=='reviewed_allowed')blockers.push('terms_not_reviewed_allowed');
  if(!['official_page_monitor','official_api','open_data','rss','partner_feed'].includes(source.acquisition_mode||''))blockers.push('acquisition_mode_not_approved');
  if(!['allowed','not_applicable'].includes(source.robots_status||''))blockers.push('robots_not_allowed');
  if(source.commercial_use_status!=='allowed')blockers.push('commercial_use_not_allowed');
  if(source.reuse_status!=='allowed')blockers.push('reuse_not_allowed');
  if(source.redistribution_status!=='allowed')blockers.push('redistribution_not_allowed');
  if(source.cache_status!=='allowed')blockers.push('cache_not_allowed');
  if(!['FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW'].includes(source.source_stage||''))blockers.push('source_stage_not_fetchable');
  if(!source.fetch_method||source.fetch_method==='MANUAL')blockers.push('fetch_method_not_automated');
  const reviewedAt=source.last_terms_checked_at?Date.parse(source.last_terms_checked_at):NaN;
  if(!Number.isFinite(reviewedAt)||!Number.isFinite(nowMs)||reviewedAt>nowMs)blockers.push('terms_review_timestamp_invalid');
  if(!source.attribution_requirement?.trim())blockers.push('attribution_missing');
  const frequency=source.update_frequency_minutes;
  if(typeof frequency!=='number'||!Number.isSafeInteger(frequency)||frequency<15||frequency>525600)blockers.push('update_frequency_invalid');
  return blockers;
}
