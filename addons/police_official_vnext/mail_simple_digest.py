"""R16: minimal public-safe metadata digest from an official mail-keishicho export.

Deliberately NO per-event approval, raw message, recipient, inferred address, map pins,
DB, HTTP client, Cron, or production release. Only the original official FORM's
one-day JSON, matched against a shape-only receipt, can become a PRIVATE candidate.
Counts are deliveries, *not* incidents. The output has publication_enabled=False.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import tempfile
from collections import Counter
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

from mail_json_private_review import normalize_private_review, SOURCE_URL
from mail_period_snapshot import verified_window_receipt
from mail_identity_reconcile import _guard_path

JST = timezone(timedelta(hours=9))
MAX_INPUT = 2_000_000
MAX_RECEIPT = 18_000
MAX_OUTPUT = 16_000
CATEGORIES = (
    '子ども関連の配信',
    '声かけ等の配信',
    '特殊詐欺関連の配信',
    '盗難関連の配信',
    '防犯情報の配信',
    'その他の配信',
    '訂正・取消等の配信',
)
LABEL_KIND = 'locally_classified_delivery_count_not_official_crime_type'
KIND = 'police_mail_official_distribution_digest'


def _unique_pairs(items):
    obj = {}
    for key, value in items:
        if key in obj:
            raise ValueError('Duplicate JSON key: abort without output')
        obj[key] = value
    return obj


def _date(value):
    if not isinstance(value, str) or not re.fullmatch(r'20\d\d-\d\d-\d\d', value):
        raise ValueError('Explicit official one-day window required')
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError('Invalid calendar day')
    return parsed


def _classify(subject):
    """Only set-valued labels leave the process; never serialize the source text."""
    if not isinstance(subject, str):
        raise ValueError('Official subject is not a string')
    s = subject.casefold()
    # Order matters: do not accidentally count a correction notice as an incident.
    if any(key in s for key in ('訂正', '取消', '取り消し', '撤回', '誤配信', '修正')):
        return CATEGORIES[6]
    if any(key in s for key in ('子ども', '子供', '児童', '通学', '登下校')):
        return CATEGORIES[0]
    if any(key in s for key in ('声かけ', 'つきまとい', '不審者', '公然わいせつ')):
        return CATEGORIES[1]
    if any(key in s for key in ('特殊詐欺', '詐欺', 'アポ電', '架電', '還付金')):
        return CATEGORIES[2]
    if any(key in s for key in ('窃盗', '盗難', '自転車盗', 'ひったくり')):
        return CATEGORIES[3]
    if any(key in s for key in ('防犯', '注意喚起', '警戒')):
        return CATEGORIES[4]
    return CATEGORIES[5]


def build_official_digest(raw: bytes, receipt: dict, *, checked_at: datetime) -> dict:
    if checked_at.tzinfo is None:
        raise ValueError('Timezone-aware local check time required')
    now = checked_at.astimezone(JST)
    if not raw or len(raw) > MAX_INPUT:
        raise ValueError('Official export out of bounded size')
    # Existing R9 strict five-field validation, plus reject duplicate source keys.
    try:
        parsed = json.loads(raw.decode('utf-8-sig', errors='strict'), object_pairs_hook=_unique_pairs)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Invalid original official JSON') from exc
    if not isinstance(parsed, list):
        # No guessed envelope or unofficial API: hold if the format changes.
        raise ValueError('Unsupported official JSON root')
    packet = normalize_private_review(raw)
    evidence = verified_window_receipt(receipt, packet)
    start, end = _date(evidence['window_start']), _date(evidence['window_end_exclusive'])
    if end - start != timedelta(days=1):
        raise ValueError('One-day bounded export required')
    # A single-day export may be replayed for offline QA, but no stale day may
    # masquerade as current distribution data. Max 2 days old at check time.
    if start > now.date() or now.date()-start > timedelta(days=2):
        raise ValueError('Export day is not current enough for a safety digest')
    counts = Counter(_classify(row['subject']) for row in parsed)
    if len(parsed) != evidence['row_count'] or not parsed:
        raise ValueError('Source/receipt row count mismatch')
    groups = [{'topic': name, 'deliveries': counts[name], 'basis': LABEL_KIND}
              for name in CATEGORIES if counts[name]]
    # A neutral, private metadata-only candidate; no signature of police or admin approval.
    result = {
        'schema_version': 1, 'kind': KIND,
        'source_url': SOURCE_URL, 'policy_url': SOURCE_URL + 'policy',
        'license': 'CC-BY-4.0', 'identity_scope': 'delivered_messages_not_incidents',
        'publication_enabled': False,
        'raw_subjects_or_bodies_included': False, 'personal_locations_included': False,
        'official_event_id_present': False, 'independent_case_deduplication': False,
        'source_export_sha256': hashlib.sha256(raw).hexdigest(),
        'export_window_start': start.isoformat(),
        'export_window_end_exclusive': end.isoformat(),
        'checked_at': now.isoformat(timespec='seconds'),
        'expires_at': (now+timedelta(hours=24)).isoformat(timespec='seconds'),
        'total_deliveries': len(parsed), 'topic_groups': groups,
        'classification_basis': LABEL_KIND,
        'points_awarded': False, 'database_changed': False,
    }
    return result


def write_private_digest(source: Path, receipt_file: Path, output: Path, *, now: datetime | None = None) -> dict:
    src = _guard_path(source, must_exist=True)
    receipt = _guard_path(receipt_file, must_exist=True, expected_dir=src.parent)
    target = _guard_path(output, must_exist=False, expected_dir=src.parent)
    if len({src, receipt, target}) != 3:
        raise ValueError('Inputs and output must be distinct')
    for item, cap in ((src, MAX_INPUT), (receipt, MAX_RECEIPT)):
        info = item.stat()
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or stat.S_IMODE(info.st_mode) & 0o077 or info.st_size > cap:
            raise ValueError('Input not a bounded, owner-only 0600 file')
    raw = src.read_bytes()
    r = json.loads(receipt.read_text('utf-8'), object_pairs_hook=_unique_pairs)
    digest = build_official_digest(raw, r, checked_at=now or datetime.now(JST))
    body = (json.dumps(digest, ensure_ascii=False, sort_keys=True, indent=2)+'\n').encode('utf-8')
    if len(body) > MAX_OUTPUT:
        raise ValueError('Unexpectedly large digest')
    fd, temp = tempfile.mkstemp(prefix='.official_digest_', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(body); f.flush(); os.fsync(f.fileno())
        os.replace(temp, target)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
    # Stdout contains only aggregate state; no original subject, body or hash.
    return {'status':'PRIVATE_OFFICIAL_DELIVERY_DIGEST_CANDIDATE',
        'total_deliveries':digest['total_deliveries'],
        'topic_count':len(digest['topic_groups']),
        'publication_enabled':False,'db_changed':False}


def main():
    parser=argparse.ArgumentParser(description='LOCAL metadata-only police delivery digest; never publish')
    parser.add_argument('--original',type=Path,required=True)
    parser.add_argument('--guarded-receipt',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    a=parser.parse_args()
    print(json.dumps(write_private_digest(a.original,a.guarded_receipt,a.output),ensure_ascii=False))


if __name__=='__main__': main()
