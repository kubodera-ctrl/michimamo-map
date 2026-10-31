"""Fail-closed review-only bridge for observed mail-keishicho JSON exports.

This does NOT create official event IDs or implement publication. It can only run
with local source/output files inside a private directory outside this repo.
The input and output contain potentially identifying descriptions: NEVER commit,
attach, publish, or upload the resulting files. CLI stdout is aggregate only.

Observed exported keys (2026-10-20 single-day official UI export):
message, send_at, send_by, send_to, subject. This is a private review packet,
NOT the public MAP snapshot contract, and not an authenticated import to DB.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import stat
import tempfile
from collections import Counter
from pathlib import Path

SOURCE_URL = 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/'
SOURCE_ID = 'tokyo_mail_keishicho_opendata'
FIELDS = frozenset({'message', 'send_at', 'send_by', 'send_to', 'subject'})
CAP = {'message': 20000, 'send_at': 100, 'send_by': 300,
       'send_to': 500, 'subject': 500}
MAX_ROWS = 20000
MAX_BYTES = 2_000_000


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize_private_review(raw: bytes) -> dict:
    """Accept exact five-field records; no inference of category, coordinates or ID."""
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError('Official JSON export size not acceptable')
    try:
        source = json.loads(raw.decode('utf-8-sig', errors='strict'))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Official export is not strict UTF-8 JSON') from exc
    if isinstance(source, dict):
        if set(source) == {'records'}:
            rows = source['records']
        elif set(source) == {'records', 'total'} and isinstance(source['total'], int) and not isinstance(source['total'], bool):
            rows = source['records']
            if source['total'] != len(rows):
                raise ValueError('Official JSON envelope total differs')
        else:
            raise ValueError('Unknown JSON envelope: explicit review required')
    elif isinstance(source, list):
        rows = source
    else:
        raise ValueError('Unknown JSON root type')
    if not isinstance(rows, list) or not 0 < len(rows) <= MAX_ROWS:
        raise ValueError('Empty or oversized official JSON array')
    source_sha = digest(raw)
    output = []
    content_hashes = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict) or set(row) != FIELDS:
            raise ValueError('Actual mail export keys differ: manual remapping required')
        if any(not isinstance(row[key], str) or len(row[key]) > CAP[key] or '\x00' in row[key]
               for key in FIELDS):
            raise ValueError('Unexpected mail data type or content size')
        canonical = json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
        fingerprint = digest(canonical)
        content_hashes.append(fingerprint)
        output.append({
            # This is NOT an issued police identifier and MUST NEVER be treated as one.
            'local_review_row_key': digest(f'{source_sha}\x1f{index}'.encode('ascii'))[:32],
            'local_export_row_number': index + 1,
            'internal_content_sha256': fingerprint,
            'official_record_id': None,
            'official_id_verified': False,
            'correction_and_withdrawal_contract_verified': False,
            'source_status': 'unverified',
            'review_status': 'pending_identity',
            'rights_status': 'unverified',
            'location_precision': 'unknown',
            'latitude': None,
            'longitude': None,
            'published_at': None,  # do not guess timezone or date semantics from send_at
            'raw_fields_private': {name: row[name] for name in sorted(FIELDS)},
        })
    repeats = sum(v - 1 for v in Counter(content_hashes).values() if v > 1)
    return {
        'schema_version': 1,
        'status': 'LOCAL_PRIVATE_REVIEW_ONLY_NOT_STAGEABLE',
        'source_id': SOURCE_ID,
        'source_url': SOURCE_URL,
        'source_export_sha256': source_sha,
        'records': output,
        'duplicate_payload_occurrences': repeats,
        'official_identity_verified': False,
        'correction_contract_verified': False,
        'rights_status': 'unverified',
        'publication_enabled': False,
        'supabase_stage_allowed': False,
        'database_changes': False,
        'location_inferred': False,
        'points_awarded': False,
        'notice': '実メッセージを含む非公開の審査専用ファイル。安定原本ID・訂正/取消・位置を推定せず、一般公開・Git・Drive保存禁止。',
    }


def _safe_paths(source: Path, target: Path) -> tuple[Path, Path]:
    if not source.is_absolute() or not target.is_absolute():
        raise ValueError('Absolute paths required')
    if source.is_symlink() or target.is_symlink():
        raise ValueError('Symlink cannot be used for police review input/output')
    source = source.resolve(strict=True)
    target = target.resolve(strict=False)
    if source == target or source.parent != target.parent:
        raise ValueError('Input and output must be distinct files in same private directory')
    if not source.parent.name.endswith('_private'):
        raise ValueError('Input/output directory must end with _private')
    # Non-public source bodies require an owner-only directory on POSIX. A name
    # ending in '_private' without private filesystem permissions is NOT secure.
    mode = stat.S_IMODE(source.parent.stat().st_mode)
    if mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise ValueError('Private directory must have mode 0700 (owner only)')
    # A private name alone is not protection: never write into tracked source tree.
    repo_root = Path(__file__).resolve().parents[2]
    if repo_root == source.parent or repo_root in source.parents:
        raise ValueError('Do not write private incident data inside public repository')
    if not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError('Input file is missing or oversized')
    # Existing output may be replaced only if a regular file under this same private dir.
    if target.exists() and not target.is_file():
        raise ValueError('Existing output is not a regular file')
    return source, target


def write_private_review(source: Path, target: Path) -> dict:
    source, target = _safe_paths(source, target)
    packet = normalize_private_review(source.read_bytes())
    body = (json.dumps(packet, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')
    fd, tmp = tempfile.mkstemp(prefix='.police_review_', suffix='.json', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            os.fchmod(out.fileno(), stat.S_IRUSR | stat.S_IWUSR)
            out.write(body)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, target)
        os.chmod(target, 0o600)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    # Never log titles, descriptions, sender/recipient, input row values or fingerprints.
    return {
        'status': packet['status'],
        'count': len(packet['records']),
        'duplicate_payload_occurrences': packet['duplicate_payload_occurrences'],
        'official_identity_verified': False,
        'correction_contract_verified': False,
        'publication_enabled': False,
        'production_changes': 0,
        'source_export_sha256': packet['source_export_sha256'],
        'private_output_verified': target.is_file() and bool(target.stat().st_mode & stat.S_IRUSR),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='LOCAL PRIVATE nonpublishable mail JSON review only; NO web/DB')
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = write_private_review(args.input, args.output)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
