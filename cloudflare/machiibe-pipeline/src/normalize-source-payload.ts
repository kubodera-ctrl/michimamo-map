import {
  normalizeCommonItem,
  parseSourcePayload,
} from '../../../shared/machiibe-ingestion/adapters';
import {
  validateNormalizedCandidate,
  type NormalizedEventCandidate,
  type SourcePolicySnapshot,
} from '../../../shared/machiibe-ingestion/contracts';

export type NormalizationPreviewRow = {
  sourceEventId: string | null;
  candidate: NormalizedEventCandidate;
  status: 'ready_for_review' | 'needs_review';
  blockers: string[];
};

/**
 * Parse a fetched Source payload through the existing shared adapters. This is
 * intentionally a pure preview seam: it never writes events or marks a row as
 * verified/publishable. Callers must supply a complete, reviewed source policy
 * snapshot and the SHA-256 of the exact raw response bytes.
 */
export function normalizeFetchedSourcePayload(
  body: string,
  source: SourcePolicySnapshot,
  rawResponseSha256: string,
) {
  if (!/^[a-f0-9]{64}$/.test(rawResponseSha256)) {
    throw new Error('raw_response_sha256_required');
  }
  if (!source.active || !source.sourceId || !source.feedUrl && !source.baseUrl) {
    throw new Error('complete_source_snapshot_required');
  }

  let payload: unknown = body;
  if (['JSON_API', 'JSON_LD'].includes(source.fetchMethod)) {
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error('source_json_invalid');
    }
  }

  const parsed = parseSourcePayload(payload, source);
  // A byte-limited response can still contain an unbounded number of tiny rows.
  // Keep preview-only POST bodies within a conservative bound until pagination
  // and a durable per-page receipt contract have been verified.
  if (parsed.items.length > 5000) {
    throw new Error('source_payload_item_limit_exceeded');
  }
  const identityCounts = new Map<string, number>();
  for (const item of parsed.items) {
    const id = item.sourceEventId?.trim();
    if (id) identityCounts.set(id, (identityCounts.get(id) || 0) + 1);
  }
  const parserBlockers = parsed.warnings.map((warning) => `source_parser_warning:${warning}`);
  const rows: NormalizationPreviewRow[] = parsed.items.map((item) => {
    // The shared dry-run adapter uses a non-cryptographic placeholder hash.
    // Replace it with the verified response hash before passing the candidate
    // to any downstream identity or persistence layer.
    const candidate = {
      ...normalizeCommonItem(item, source),
      sourceHash: rawResponseSha256,
    };
    const blockers = validateNormalizedCandidate(candidate).errors;
    if (!candidate.sourceEventId?.trim()) blockers.push('stable_source_event_id_required');
    if (!candidate.officialUrl) blockers.push('official_event_url_required');
    if (!candidate.startAt || !candidate.endAt) blockers.push('event_dates_required');
    // Duplicate IDs in one fetch are ambiguous, even if Supabase would silently
    // ignore a row through resolution=ignore-duplicates. Review *all* copies.
    if (candidate.sourceEventId?.trim() && identityCounts.get(candidate.sourceEventId.trim())! > 1) {
      blockers.push('duplicate_source_event_id_in_batch');
    }
    blockers.push(...parserBlockers);
    return {
      sourceEventId: candidate.sourceEventId,
      candidate,
      status: blockers.length ? 'needs_review' : 'ready_for_review',
      blockers: [...new Set(blockers)],
    };
  });

  return {
    sourceId: source.sourceId,
    rawResponseSha256,
    parsedCount: rows.length,
    parserWarnings: parsed.warnings,
    rows,
    // This result is never an approval or publication decision.
    publicationEnabled: false as const,
  };
}
