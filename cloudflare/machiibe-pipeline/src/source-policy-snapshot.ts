import {
  SOURCE_FETCH_METHODS,
  SOURCE_STAGES,
  type SourcePolicySnapshot,
} from '../../../shared/machiibe-ingestion/contracts';

export type RegionalSourcePolicyRow = {
  id: number;
  name: string;
  source_kind: string;
  prefecture: string | null;
  municipality: string | null;
  homepage_url: string;
  data_url: string | null;
  fetch_method: string | null;
  terms_review_status: string | null;
  robots_status: string | null;
  commercial_use_status: string | null;
  reuse_status: string | null;
  redistribution_status: string | null;
  cache_status: string | null;
  image_use_status_source: string | null;
  sns_use_status: string | null;
  attribution_requirement: string | null;
  source_stage: string | null;
  last_terms_checked_at: string | null;
  update_frequency_minutes: number | null;
  last_checked_at: string | null;
  last_success_at: string | null;
  consecutive_failures: number | null;
  is_active: boolean | null;
  priority: number | null;
  automated_fetch_allowed: boolean | null;
  event_use_allowed?: boolean | null;
  source_etag: string | null;
  source_last_modified: string | null;
};

const choices = {
  termsStatus: ['pending', 'reviewed_facts_only', 'reviewed_allowed', 'reviewed_restricted', 'contact_required'],
  robotsStatus: ['pending', 'allowed', 'disallowed', 'not_applicable'],
  useStatus: ['unknown', 'allowed', 'conditional', 'disallowed'],
  imageStatus: ['unknown', 'allowed', 'conditional', 'disallowed', 'not_applicable'],
} as const;

function member<T extends readonly string[]>(value: string | null, set: T, fallback: T[number], name: string, blockers: string[]) {
  if (value && (set as readonly string[]).includes(value)) return value as T[number];
  blockers.push(`${name}_missing_or_invalid`);
  return fallback;
}

/** Map the actual regional_sources contract into the shared parser's source contract.
 * Missing or unknown policy data is represented conservatively and returned as blockers;
 * this helper does not authorize fetches or infer a source review.
 */
export function sourcePolicySnapshotFromRegionalRow(row: RegionalSourcePolicyRow, nowMs = Date.now()) {
  const blockers: string[] = [];
  if (!Number.isSafeInteger(row.id) || row.id <= 0) blockers.push('source_id_invalid');
  if (!row.name?.trim()) blockers.push('source_name_missing');
  if (!/^https:\/\//i.test(row.homepage_url || '')) blockers.push('source_homepage_invalid');
  if (row.data_url && !/^https:\/\//i.test(row.data_url)) blockers.push('source_feed_url_invalid');
  const checkedAt = row.last_terms_checked_at ? Date.parse(row.last_terms_checked_at) : NaN;
  if (!Number.isFinite(checkedAt) || !Number.isFinite(nowMs) || checkedAt > nowMs) blockers.push('terms_review_timestamp_invalid');
  if (!row.attribution_requirement?.trim()) blockers.push('attribution_missing');
  if (!Number.isSafeInteger(row.update_frequency_minutes) || row.update_frequency_minutes! < 15 || row.update_frequency_minutes! > 525600) {
    blockers.push('update_frequency_invalid');
  }
  const method = member(row.fetch_method, SOURCE_FETCH_METHODS, 'MANUAL', 'fetch_method', blockers);
  const stage = member(row.source_stage, SOURCE_STAGES, 'CANDIDATE', 'source_stage', blockers);
  const source: SourcePolicySnapshot = {
    sourceId: Number.isSafeInteger(row.id) && row.id > 0 ? row.id : 0,
    sourceName: row.name || '',
    sourceType: row.source_kind || 'manual',
    prefecture: row.prefecture,
    municipality: row.municipality,
    baseUrl: row.homepage_url || '',
    feedUrl: row.data_url,
    fetchMethod: method,
    termsStatus: member(row.terms_review_status, choices.termsStatus, 'pending', 'terms_status', blockers),
    robotsStatus: member(row.robots_status, choices.robotsStatus, 'pending', 'robots_status', blockers),
    commercialUseStatus: member(row.commercial_use_status, choices.useStatus, 'unknown', 'commercial_use_status', blockers),
    reuseStatus: member(row.reuse_status, choices.useStatus, 'unknown', 'reuse_status', blockers),
    redistributionStatus: member(row.redistribution_status, choices.useStatus, 'unknown', 'redistribution_status', blockers),
    cacheStatus: member(row.cache_status, choices.useStatus, 'unknown', 'cache_status', blockers),
    imageUseStatus: member(row.image_use_status_source, choices.imageStatus, 'unknown', 'image_use_status', blockers),
    snsUseStatus: member(row.sns_use_status, choices.imageStatus, 'unknown', 'sns_use_status', blockers),
    attributionRequirement: row.attribution_requirement,
    sourceStage: stage,
    lastTermsCheckedAt: row.last_terms_checked_at,
    updateFrequencyMinutes: row.update_frequency_minutes ?? 0,
    lastCheckedAt: row.last_checked_at,
    lastSuccessAt: row.last_success_at,
    failureCount: row.consecutive_failures ?? 0,
    active: row.is_active === true,
    priority: row.priority ?? 0,
    automatedFetchAllowed: row.is_active === true && row.event_use_allowed === true && row.automated_fetch_allowed === true && blockers.length === 0,
    etag: row.source_etag,
    lastModified: row.source_last_modified,
  };
  return { source, blockers: [...new Set(blockers)] };
}
