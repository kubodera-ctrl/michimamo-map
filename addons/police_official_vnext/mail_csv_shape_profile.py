"""Schema-only profile of a real public Mail Keishicho CSV that fails strict parse.

The profiler does not log/store any original data row, person's text, category,
location or message. Metadata is NOT an import contract and never grants rights.
"""
from __future__ import annotations

import csv
import hashlib
import io
from collections import Counter

MAX_BYTES = 2_000_000
MAX_ROWS = 20_000


def profile_bytes(raw: bytes) -> dict:
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError('CSV is empty or unexpectedly large')
    decoded = None
    encoding = None
    for name in ('utf-8-sig','cp932'):
        try:
            decoded = raw.decode(name, errors='strict')
            encoding = name
            break
        except UnicodeDecodeError:
            pass
    if decoded is None or decoded.lstrip().lower().startswith(('<html','<!doctype')):
        raise ValueError('Downloaded data is not a recognized CSV document')
    reader = csv.reader(io.StringIO(decoded), strict=True)
    try:
        header = next(reader)
    except StopIteration as exc:
        raise ValueError('No source header') from exc
    if not (1 <= len(header) <= 200) or len(set(header)) != len(header) or any(not h.strip() or len(h)>160 for h in header):
        raise ValueError('Invalid or duplicated header')
    field_count = Counter()
    mismatch_rows = []
    count = 0
    for row in reader:
        count += 1
        if count > MAX_ROWS:
            raise ValueError('Too many rows for bounded schema-only diagnostic')
        field_count[len(row)] += 1
        if len(row) != len(header) and len(mismatch_rows) < 12:
            mismatch_rows.append(count)  # row index only; NEVER reveal row values
    if count == 0:
        raise ValueError('No data rows')
    mismatched = sum(v for k,v in field_count.items() if k != len(header))
    return {
        'profile_status':'SCHEMA_ONLY_HOLD_NOT_IMPORTABLE',
        'sha256':hashlib.sha256(raw).hexdigest(),
        'bytes':len(raw), 'encoding':encoding,
        'header_columns':len(header), 'columns':header,
        'data_rows':count,
        'field_count_distribution':{str(k):v for k,v in sorted(field_count.items())},
        'mismatched_rows':mismatched,
        'mismatch_row_indices_first_12':mismatch_rows,
        'row_text_logged':False,
        'authoritative_id_semantics_verified':False,
        'license_or_publish_approved':False,
        'database_changes':False,
    }
