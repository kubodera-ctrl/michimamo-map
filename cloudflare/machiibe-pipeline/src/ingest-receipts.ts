/**
 * R34: durable non-production receipt contract.
 * The current DB schema's unique(source_id, source_event_id, raw_hash) cannot
 * deduplicate missing source IDs and silently drops repeated IDs in a batch.
 * Preserve raw R2 provenance, quarantine ambiguous identities, and require
 * exact receipt readback before a queue ACK. No canonical event write here.
 */
export type IngestReceiptInput = {
  job_id: string;
  source_id: number;
  source_event_id: string | null;
  raw_hash: string;
  raw_object_key: string;
  normalization_status: string;
  error_code?: string | null;
  error_message?: string | null;
  [key: string]: unknown;
};

export type IngestReceipt = IngestReceiptInput & {receipt_key: string};
const RAW_HASH = /^[0-9a-f]{64}$/;
const MAX_RECEIPT_ROWS = 200;

export function buildIngestReceipts(rows: IngestReceiptInput[]): IngestReceipt[] {
  if (!rows.length || rows.length > MAX_RECEIPT_ROWS) {
    throw new Error('source_receipt_batch_limit_or_empty');
  }
  const first = rows[0];
  const source = first.source_id;
  const hash = first.raw_hash;
  const objectKey = first.raw_object_key;
  if (!Number.isSafeInteger(source) || source <= 0 || !RAW_HASH.test(hash) || !objectKey) {
    throw new Error('source_receipt_contract_invalid');
  }
  const idGroups = new Map<string, number>();
  for (const row of rows) {
    if (row.source_id !== source || row.raw_hash !== hash || row.raw_object_key !== objectKey) {
      throw new Error('source_receipt_batch_mixed_origin');
    }
    const id = row.source_event_id?.trim();
    if (id) idGroups.set(id, (idGroups.get(id) || 0) + 1);
  }
  const firstStableIds = new Set<string>();
  const result: IngestReceipt[] = [];
  for (const [index, row] of rows.entries()) {
    const id = row.source_event_id?.trim() || null;
    // Due to the upstream DB's pre-existing unique key, two rows with a
    // duplicate real source ID cannot both be saved. Keep one review receipt;
    // R2 contains all original rows for human inspection.
    if (id && firstStableIds.has(id)) continue;
    if (id) firstStableIds.add(id);
    const duplicateCount = id ? idGroups.get(id) ?? 0 : 0;
    const hold = duplicateCount > 1 || !id || row.normalization_status === 'needs_review';
    const failures = [row.error_message, duplicateCount > 1 ? `duplicate_source_event_id_in_batch:${duplicateCount}` : null]
      .filter((value): value is string => typeof value === 'string' && !!value);
    result.push({
      ...row,
      source_event_id: id,
      normalization_status: hold ? 'needs_review' : 'pending',
      error_code: hold ? 'NORMALIZATION_REVIEW_REQUIRED' : (row.error_code || null),
      error_message: failures.join(',') || null,
      // The receipt key is a *transport receipt*, not a verified event ID.
      // It remains stable on a retry and for a repeat fetch of identical bytes.
      receipt_key: `r34:${source}:${hash}:${index}`,
    });
  }
  if (!result.length) throw new Error('source_receipt_batch_empty');
  return result;
}

export type ReceiptReadback = {
  receipt_key: string;
  source_id: number;
  raw_hash: string;
  source_event_id: string | null;
  raw_object_key: string | null;
};

/** Positive proof for ACK: every expected receipt is present with matching
 * provenance. Never infer success solely from PostgREST HTTP 200/201/204. */
export function verifyIngestReceipts(expected: IngestReceipt[], persisted: ReceiptReadback[]): boolean {
  if (persisted.length !== expected.length) return false;
  const byKey = new Map(persisted.map(row => [row.receipt_key, row]));
  if (byKey.size !== expected.length) return false;
  for (const row of expected) {
    const found = byKey.get(row.receipt_key);
    if (!found || found.source_id !== row.source_id || found.raw_hash !== row.raw_hash
        || found.source_event_id !== row.source_event_id || !found.raw_object_key) {
      return false;
    }
  }
  return true;
}

export function receiptReadbackPath(receipts: IngestReceipt[]): string {
  if (!receipts.length || receipts.length > MAX_RECEIPT_ROWS) throw new Error('receipt_readback_invalid_size');
  // PostgREST IN accepts URL-encoded parenthesized values. Read in bounded
  // chunks to prevent oversized query URLs and unpredictable API load.
  const keys = receipts.map(row => row.receipt_key);
  if (keys.some(key => !/^r34:[0-9]+:[0-9a-f]{64}:[0-9]+$/.test(key))) throw new Error('receipt_key_invalid');
  return 'machiibe_ingest_items?select=receipt_key,source_id,raw_hash,source_event_id,raw_object_key&receipt_key=in.'
    + encodeURIComponent(`(${keys.join(',')})`);
}

export const receiptBatchMax = MAX_RECEIPT_ROWS;
