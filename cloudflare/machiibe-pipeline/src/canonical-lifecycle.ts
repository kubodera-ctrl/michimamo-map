import {
  detectEventChanges,
  validateNormalizedCandidate,
  sourceAutomationAllowed,
  type NormalizedEventCandidate,
  type SourcePolicySnapshot,
} from '../../../shared/machiibe-ingestion/contracts';

/** R35: conservative, pure canonical-event lifecycle planner.
 * This module never mutates the database or publishes a draft event. The
 * application boundary must enforce optimistic concurrency and an atomic
 * update to events + event_source_records. */
export type ExistingCanonicalEvent = {
  id: number;
  sourceId: number;
  sourceEventId: string;
  officialUrl: string;
  contentHash: string;
  title: string;
  startDate: string;
  endDate: string;
  venueName: string | null;
  priceType: 'free' | 'partly_free' | 'paid' | 'unknown';
  eventStatus: 'scheduled' | 'changed' | 'postponed' | 'cancelled' | 'sold_out' | 'registration_closed';
  verificationStatus: 'verified' | 'unverified' | 'needs_review';
  publicationStatus: 'draft' | 'published' | 'expired' | 'hidden';
  scheduleType: 'single' | 'continuous' | 'recurring' | 'irregular';
};
export type StatusEvidence = {
  /** Explicit authoritative field only; never infer cancellation from absence. */
  value: 'scheduled' | 'changed' | 'postponed' | 'cancelled' | 'sold_out' | 'registration_closed';
  sourceEventId: string;
  eventSpecificUrl: string;
  observedAt: string;
};
export type LifecycleContext = {
  source: SourcePolicySnapshot;
  candidate: NormalizedEventCandidate;
  existing: ExistingCanonicalEvent | null;
  sourceReadinessVerified: boolean;
  eventUrlVerified: boolean;
  /** Full feed completeness is needed for inferred disappearance/expiry. */
  completeFeed: boolean;
  statusEvidence?: StatusEvidence | null;
  asOfMs?: number;
};
export type LifecyclePlan = {
  action: 'hold' | 'new_draft' | 'unchanged' | 'update_existing';
  blockers: string[];
  changeKinds: string[];
  changedFields: string[];
  patch: Record<string, string | null> | null;
  expectedContentHash: string | null;
  newContentHash: string;
  /** Published status must never be switched on by automated ingestion. */
  publishNewEvent: false;
};

function isoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(ms) && new Date(ms).toISOString().startsWith(value) ? value : null;
}
const allowedStatuses = new Set(['scheduled','changed','postponed','cancelled','sold_out','registration_closed']);

export function planCanonicalLifecycle(ctx: LifecycleContext): LifecyclePlan {
  const {source,candidate,existing}=ctx;
  const blockers: string[] = [];
  if (!ctx.sourceReadinessVerified || !sourceAutomationAllowed(source)) blockers.push('source_not_approved_for_automation');
  if (!candidate.sourceEventId?.trim() || candidate.sourceId!==source.sourceId) blockers.push('source_identity_unverified');
  if (!candidate.officialUrl || !candidate.officialUrl.startsWith('https://') || candidate.officialUrl===source.feedUrl || candidate.officialUrl===source.baseUrl) {
    blockers.push('event_specific_official_url_required');
  }
  if (!ctx.eventUrlVerified) blockers.push('event_url_evidence_unverified');
  if (!candidate.title?.trim() || candidate.title.length > 300) blockers.push('event_title_unverified');
  if (!candidate.prefecture?.trim()) blockers.push('event_prefecture_unverified');
  const start = isoDate(candidate.startAt),end=isoDate(candidate.endAt);
  if (!start || !end || end < start) blockers.push('event_dates_unverified');
  if (candidate.imageUrl && candidate.imageRightsStatus!=='commercial_allowed') blockers.push('event_media_rights_unverified');
  blockers.push(...validateNormalizedCandidate(candidate).errors);
  const statusEvidence = ctx.statusEvidence ?? null;
  if(statusEvidence){
    if(!allowedStatuses.has(statusEvidence.value)||statusEvidence.sourceEventId!==candidate.sourceEventId
      ||statusEvidence.eventSpecificUrl!==candidate.officialUrl
      ||!Number.isFinite(Date.parse(statusEvidence.observedAt))
      ||Date.parse(statusEvidence.observedAt)>(ctx.asOfMs??Date.now())){
      blockers.push('event_status_evidence_unverified');
    }
  }
  if (candidate.status==='cancelled'||candidate.status==='postponed'||candidate.status==='expired'){
    // The adapter's candidate.status cannot itself attest a cancellation.
    // Explicit event-level source evidence is mandatory.
    if(!statusEvidence || statusEvidence.value!==candidate.status) blockers.push('explicit_event_status_evidence_required');
  }
  if (existing) {
    if (existing.sourceId!==candidate.sourceId || existing.sourceEventId!==candidate.sourceEventId){
      blockers.push('canonical_identity_mismatch');
    }
    if(existing.officialUrl!==candidate.officialUrl)blockers.push('official_event_url_changed_requires_review');
    if(existing.verificationStatus!=='verified'||existing.publicationStatus!=='published')blockers.push('existing_event_not_verified_published');
    // A partial record cannot erase previously verified facts.
    if(existing.venueName && !candidate.venueName)blockers.push('venue_removal_requires_review');
    if(existing.priceType!=='unknown'&&candidate.priceType==='unknown')blockers.push('verified_price_removal_requires_review');
  }
  const emptyResult=(action:'hold'|'new_draft'|'unchanged',changes:string[]=[],fields:string[]=[])=>({
    action,blockers:[...new Set(blockers)],changeKinds:changes,changedFields:fields,patch:null,
    expectedContentHash:existing?.contentHash??null,newContentHash:candidate.sourceHash,publishNewEvent:false as const
  });
  if(blockers.length)return emptyResult('hold');
  if(!existing)return emptyResult('new_draft');
  // Never infer cancellation from an event missing in a feed. Expiry of
  // recurring/irregular schedules requires their occurrence ledger.
  if(existing.scheduleType==='recurring'||existing.scheduleType==='irregular'){
    if(candidate.status==='expired')return {...emptyResult('hold'),blockers:['recurring_expiry_requires_occurrence_review']};
  }
  const status=statusEvidence?.value ?? existing.eventStatus;
  const diff=detectEventChanges({
    sourceHash:existing.contentHash,title:existing.title,startAt:existing.startDate,endAt:existing.endDate,
    venueName:existing.venueName,priceType:existing.priceType,priceMin:null,priceMax:null,status:existing.eventStatus
  },{
    sourceHash:candidate.sourceHash,title:candidate.title,startAt:start,endAt:end,
    venueName:candidate.venueName,priceType:candidate.priceType,priceMin:null,priceMax:null,status
  });
  if(!diff.changed)return emptyResult('unchanged',diff.kinds,diff.fields);
  const patch:Record<string,string|null>={};
  const set=(field:string,value:string|null)=>{patch[field]=value;};
  if(diff.fields.includes('title'))set('title',candidate.title);
  if(diff.fields.includes('startAt'))set('start_date',start);
  if(diff.fields.includes('endAt'))set('end_date',end);
  if(diff.fields.includes('venueName'))set('venue_name',candidate.venueName);
  if(diff.fields.includes('priceType'))set('price_type',candidate.priceType);
  if(diff.fields.includes('status'))set('event_status',status);
  return {
    action:'update_existing',blockers:[],changeKinds:diff.kinds,changedFields:diff.fields,
    patch,expectedContentHash:existing.contentHash,newContentHash:candidate.sourceHash,publishNewEvent:false
  };
}

/** Checked RPC argument envelope. Caller must use a server-only credential,
 * keep CANONICAL_UPDATE_ENABLED unset in every deployed environment, and
 * compare the returned affected event id against the expected event. */
export function lifecycleMutationParameters(plan:LifecyclePlan,existing:ExistingCanonicalEvent,source:SourcePolicySnapshot){
  if(plan.action!=='update_existing'||!plan.patch||plan.blockers.length||!sourceAutomationAllowed(source)){
    throw new Error('canonical_mutation_not_approved');
  }
  return {p_event_id:existing.id,p_source_id:existing.sourceId,p_source_event_key:existing.sourceEventId,
    p_expected_hash:plan.expectedContentHash,p_new_hash:plan.newContentHash,p_patch:plan.patch};
}
