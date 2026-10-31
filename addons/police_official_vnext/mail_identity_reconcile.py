"""Compare two PRIVATE mail-keishicho JSON review packets without inventing official IDs.

Only exact payload fingerprints are *possible repeated text*; they are NOT evidence
of identical police incidents. A missing message is NOT a police withdrawal, and a
changed message is NOT evidence of an official correction. No DB, network or publish.
Private metadata contains hashed row handles; it must stay in a mode-0700 folder.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from mail_json_private_review import (SOURCE_ID, SOURCE_URL, FIELDS, CAP,
                                       MAX_ROWS, MAX_BYTES)

MAX_PRIVATE_PACKET_BYTES = 8_000_000
_HEX64 = re.compile(r'^[0-9a-f]{64}$')
_HEX32 = re.compile(r'^[0-9a-f]{32}$')


def _canonical_hash(row: dict) -> str:
    canonical = json.dumps(row, ensure_ascii=False, sort_keys=True,
                           separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(canonical).hexdigest()


def _inspect_private(packet: dict) -> tuple[str, dict[str, list[str]], int]:
    """Recompute private fingerprints, rejecting tampered/incompletely gated packets."""
    if not isinstance(packet, dict) or packet.get('schema_version') != 1:
        raise ValueError('Unexpected private review schema')
    required = {
        'status': 'LOCAL_PRIVATE_REVIEW_ONLY_NOT_STAGEABLE',
        'source_id': SOURCE_ID, 'source_url': SOURCE_URL,
        'publication_enabled': False, 'supabase_stage_allowed': False,
        'official_identity_verified': False, 'correction_contract_verified': False,
        'rights_status': 'unverified', 'database_changes': False,
        'location_inferred': False, 'points_awarded': False,
    }
    if any(packet.get(k) != v or type(packet.get(k)) is not type(v) for k, v in required.items()):
        raise ValueError('Private review publication or origin boundary mismatch')
    sha = packet.get('source_export_sha256')
    records = packet.get('records')
    if not isinstance(sha, str) or not _HEX64.fullmatch(sha):
        raise ValueError('Missing complete source export digest')
    if not isinstance(records, list) or not 0 < len(records) <= MAX_ROWS:
        raise ValueError('Invalid private review count')
    grouped: dict[str, list[str]] = defaultdict(list)
    for idx, record in enumerate(records):
        if not isinstance(record, dict):
            raise ValueError('Private row must be an object')
        source_index = idx + 1
        expected_key = hashlib.sha256(f'{sha}\x1f{idx}'.encode('ascii')).hexdigest()[:32]
        if (record.get('local_export_row_number') != source_index or
            record.get('local_review_row_key') != expected_key or
            not _HEX32.fullmatch(record.get('local_review_row_key', ''))):
            raise ValueError('Private row order/identity contract changed')
        blockers = {
            'official_record_id': None, 'official_id_verified': False,
            'correction_and_withdrawal_contract_verified': False,
            'source_status': 'unverified', 'review_status': 'pending_identity',
            'rights_status': 'unverified', 'location_precision': 'unknown',
            'latitude': None, 'longitude': None, 'published_at': None,
        }
        if any(record.get(k) != v or (v is False and type(record.get(k)) is not bool)
               for k, v in blockers.items()):
            raise ValueError('Private row must remain nonpublishable and unverified')
        fields = record.get('raw_fields_private')
        if not isinstance(fields, dict) or set(fields) != FIELDS or any(
            not isinstance(fields[k], str) or len(fields[k]) > CAP[k] or '\x00' in fields[k]
            for k in FIELDS
        ):
            raise ValueError('Unexpected private source fields')
        expected_hash = _canonical_hash(fields)
        if record.get('internal_content_sha256') != expected_hash:
            raise ValueError('Private original content digest differs')
        grouped[expected_hash].append(expected_key)
    repeated = sum(len(v)-1 for v in grouped.values())
    if packet.get('duplicate_payload_occurrences') != repeated:
        raise ValueError('Private repeated-payload accounting mismatch')
    return sha, dict(grouped), len(records)


def reconcile_packets(previous: dict, current: dict) -> dict:
    """Candidate matching only. NEVER infer official duplicates, edits, or withdrawal."""
    a_sha, old, n_old = _inspect_private(previous)
    b_sha, new, n_new = _inspect_private(current)
    groups = []
    matched = removed_like = new_like = repeated_groups = 0
    for digest in sorted(set(old) | set(new)):
        before, after = old.get(digest, []), new.get(digest, [])
        shared = min(len(before), len(after))
        matched += shared
        removed_like += len(before) - shared
        new_like += len(after) - shared
        if len(before) > 1 or len(after) > 1:
            repeated_groups += 1
        groups.append({
            'private_payload_sha256': digest,
            'previous_local_row_keys': before,
            'current_local_row_keys': after,
            'exact_text_candidate_occurrences': shared,
            'previous_unmatched_occurrences_NOT_WITHDRAWALS': len(before)-shared,
            'current_unmatched_occurrences_NOT_NEW_INCIDENTS': len(after)-shared,
            'identity_verified': False,
            'correction_verified': False,
            'withdrawal_verified': False,
        })
    assert matched + removed_like == n_old
    assert matched + new_like == n_new
    return {
        'schema_version': 1, 'status': 'PRIVATE_CANDIDATE_RECONCILIATION_ONLY',
        'source_id': SOURCE_ID,
        'source_export_receipts': {'previous_sha256': a_sha, 'current_sha256': b_sha},
        'previous_rows': n_old, 'current_rows': n_new,
        'possible_exact_text_overlap': matched,
        'previous_only_text_occurrences': removed_like,
        'current_only_text_occurrences': new_like,
        'repeated_payload_groups_needing_review': repeated_groups,
        'groups_private_only': groups,
        'source_period_verified': False,  # exported day/window NOT in source JSON
        'official_event_identity_verified': False,
        'correction_equivalence_verified': False,
        'missing_means_withdrawn': False,
        'new_text_means_new_incident': False,
        'fuzzy_matching_attempted': False,
        'automatic_deduplication': False,
        'publication_enabled': False, 'supabase_stage_allowed': False,
        'rights_status': 'unverified', 'points_awarded': False,
        'database_changes': False, 'production_changes': 0,
        'review_requirement': 'Official stable identity/correction evidence or explicit human legal-source review; do not infer from text.',
    }


def _guard_path(path: Path, *, must_exist: bool, expected_dir: Path | None = None) -> Path:
    if not path.is_absolute() or path.is_symlink():
        raise ValueError('Use absolute, non-symlink private paths')
    resolved = path.resolve(strict=must_exist)
    parent = resolved.parent
    if expected_dir is not None and parent != expected_dir:
        raise ValueError('All comparison files must share one private directory')
    if not parent.is_dir() or not parent.name.endswith('_private'):
        raise ValueError('Directory must end with _private')
    if stat.S_IMODE(parent.stat().st_mode) & 0o077:
        raise ValueError('Private directory must be owner-only 0700')
    repo_root = Path(__file__).resolve().parents[2]
    if repo_root == parent or repo_root in parent.parents:
        raise ValueError('Private police rows must not be within public source repository')
    if must_exist:
        if not resolved.is_file() or resolved.stat().st_size > MAX_PRIVATE_PACKET_BYTES:
            raise ValueError('Input is not a bounded private regular file')
    elif resolved.exists() and not resolved.is_file():
        raise ValueError('Output must be a regular file')
    return resolved


def write_private_comparison(previous_path: Path, current_path: Path, output_path: Path) -> dict:
    p = _guard_path(previous_path, must_exist=True)
    n = _guard_path(current_path, must_exist=True, expected_dir=p.parent)
    o = _guard_path(output_path, must_exist=False, expected_dir=p.parent)
    if len({p,n,o}) != 3:
        raise ValueError('Private input/output paths must be distinct')
    old = json.loads(p.read_text(encoding='utf-8'))
    new = json.loads(n.read_text(encoding='utf-8'))
    result = reconcile_packets(old, new)
    body = (json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode('utf-8')
    if len(body) > MAX_PRIVATE_PACKET_BYTES:
        raise ValueError('Private comparison too large; no write')
    fd, tmp = tempfile.mkstemp(prefix='.police_compare_', suffix='.json', dir=o.parent)
    try:
        with os.fdopen(fd,'wb') as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(body); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, o)
        os.chmod(o, 0o600)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    # ONLY counters, never fingerprint or row content to stdout.
    return {k: result[k] for k in ('status','previous_rows','current_rows',
        'possible_exact_text_overlap','previous_only_text_occurrences',
        'current_only_text_occurrences','repeated_payload_groups_needing_review',
        'publication_enabled','supabase_stage_allowed','database_changes')}


def main() -> int:
    p = argparse.ArgumentParser(description='Private potential-text overlap only; no police IDs or public release')
    p.add_argument('--previous', type=Path, required=True)
    p.add_argument('--current', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(write_private_comparison(args.previous,args.current,args.output), ensure_ascii=False))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
