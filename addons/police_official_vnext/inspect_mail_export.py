"""Offline schema-only inspection for a *user-supplied* mail-keishicho export.

No endpoint guessing, login, network, Supabase, user data uploads, or automatic
identity/license assertions. Prints column names and counts, NEVER row values.
"""
from __future__ import annotations
import argparse, csv, hashlib, io, json
from pathlib import Path

MAX_BYTES = 10_000_000
MAX_ROWS = 20_000
MAX_FIELDS = 200


def _columns(headers):
    if (not headers or len(headers) > MAX_FIELDS or
        any(not isinstance(h,str) or not h.strip() or len(h)>160 for h in headers) or
        len(set(headers))!=len(headers)):
        raise ValueError('Invalid, empty or duplicated export columns')
    return sorted(headers)


def inspect_bytes(raw: bytes, format_name: str) -> dict:
    if not raw or len(raw)>MAX_BYTES:
        raise ValueError('Mail export empty or above size limit')
    if format_name not in ('csv','json'):
        raise ValueError('Only CSV or JSON supported. Export must be reviewed manually.')
    if format_name == 'csv':
        for encoding in ('utf-8-sig','cp932'):
            try: text=raw.decode(encoding,errors='strict');break
            except UnicodeDecodeError:continue
        else: raise ValueError('Unknown export encoding')
        reader=csv.DictReader(io.StringIO(text))
        headers=_columns(reader.fieldnames)
        count=0
        for row in reader:
            if None in row or len(row)!=len(headers):
                raise ValueError('Inconsistent CSV row shape')
            count+=1
            if count>MAX_ROWS:raise ValueError('Export has too many rows')
    else:
        encoding='utf-8-sig'
        obj=json.loads(raw.decode(encoding,errors='strict'))
        records=obj['records'] if isinstance(obj,dict) and 'records' in obj else obj
        if not isinstance(records,list) or not records or len(records)>MAX_ROWS:
            raise ValueError('JSON records missing or too many')
        if any(not isinstance(row,dict) or not row for row in records):
            raise ValueError('JSON row not object')
        keys=set(records[0])
        # Differing keys may encode unknown date/correction semantics; fail closed.
        if any(set(row)!=keys for row in records):
            raise ValueError('JSON record keys inconsistent')
        headers=_columns(list(keys))
        count=len(records)
    if count==0:raise ValueError('Export has no records')
    return {
        'inspection':'SCHEMA_ONLY_NOT_AUTHENTICATED',
        'source_claim':'NOT_PROVEN_BY_FILE_CONTENTS',
        'sha256':hashlib.sha256(raw).hexdigest(),
        'bytes':len(raw),
        'format':format_name,
        'encoding':encoding,
        'columns':headers,
        'records':count,
        'stable_official_record_id_verified':False,
        'correction_and_withdrawal_contract_verified':False,
        'dataset_rights_verified':False,
        'publishable':False,
        'importable_to_live_db':False,
        'requires_manual_mapping':True,
    }


def main():
    p=argparse.ArgumentParser(description='Local-only schema diagnostics. Never prints individual incidents.')
    p.add_argument('--input',type=Path,required=True)
    a=p.parse_args()
    if a.input.is_symlink():raise ValueError('Symlink export inputs forbidden')
    suffix=a.input.suffix.lower().lstrip('.')
    # Caller chooses the official export manually; tool does not authenticate it.
    print(json.dumps(inspect_bytes(a.input.read_bytes(),suffix),ensure_ascii=False,indent=2))

if __name__=='__main__':main()
