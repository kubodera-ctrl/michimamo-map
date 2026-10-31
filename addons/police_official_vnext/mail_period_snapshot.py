"""R11: PRIVATE, delivery-window snapshot candidate for an official mail JSON export.

This never identifies a police *incident*. Version numbers identify only the local
export-window review candidate. A guarded form receipt is evidence of what a UI
said it requested, not a signed official identity or a publication license.

Output is PRIVATE metadata (SHA and counts). No source message body is copied.
No network, Supabase, public file generation, auto-approval, or live DB calls.
"""
from __future__ import annotations

import argparse
import hashlib
import fcntl
import json
import os
import stat
import tempfile
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path

from mail_identity_reconcile import _guard_path, _inspect_private
from mail_json_private_review import SOURCE_ID, SOURCE_URL, FIELDS

MAX_RECEIPT_BYTES = 18000
MAX_HISTORY_BYTES = 200000
MAX_VERSIONS = 200
ONE_DAY_STATUS = 'OFFICIAL_MAIL_MINIMAL_UI_EXPORT_SCHEMA_ONLY'


def sha_json(value: object) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
        separators=(',', ':')).encode('utf-8')).hexdigest()


def _is_false(value: object) -> bool:
    return value is False


def _day(value: object) -> date:
    if not isinstance(value,str) or len(value)!=10:
        raise ValueError('Explicit YYYY-MM-DD form date required')
    day=date.fromisoformat(value)
    if day.isoformat()!=value or not date(2025,1,1)<=day<=date(2100,12,31):
        raise ValueError('Date outside the verified form range')
    return day


def verified_window_receipt(receipt: dict, packet: dict) -> dict:
    """Check evidence consistency; never call it a signed/authoritative receipt."""
    source_sha, hashes, count = _inspect_private(packet)
    if not isinstance(receipt,dict) or len(json.dumps(receipt,ensure_ascii=False))>MAX_RECEIPT_BYTES:
        raise ValueError('Missing or oversized date-window receipt')
    required_keys={'status','official_form','selected_format','export_day',
        'date_to_exclusive','schema','post','raw_csv_persisted','raw_rows_logged',
        'db_changed','publication_enabled','stable_source_id_semantics_confirmed',
        'correction_and_withdrawal_semantics_confirmed'}
    if set(receipt)!=required_keys or receipt['status']!=ONE_DAY_STATUS or \
       receipt['official_form']!=SOURCE_URL or receipt['selected_format']!='json':
        raise ValueError('Untrusted or mismatched official form receipt')
    start=_day(receipt['export_day']); end=_day(receipt['date_to_exclusive'])
    if end-start!=timedelta(days=1):
        raise ValueError('One-day public export is required; no broad data windows')
    if any(not _is_false(receipt[k]) for k in (
        'raw_csv_persisted','raw_rows_logged','db_changed','publication_enabled',
        'stable_source_id_semantics_confirmed','correction_and_withdrawal_semantics_confirmed')):
        raise ValueError('Receipt must remain non-publishing and unverified')
    post=receipt['post']
    if not isinstance(post,dict) or set(post)!={'only_public_day_range','sent_count','blocked_count'} or \
       post['only_public_day_range'] is not True or type(post['sent_count']) is not int or \
       post['sent_count']!=1 or type(post['blocked_count']) is not int or post['blocked_count']!=0:
        raise ValueError('Unverified form request; one guarded POST required')
    s=receipt['schema']
    expected_schema={'bytes','columns','correction_and_withdrawal_contract_verified',
        'dataset_rights_verified','encoding','format','importable_to_live_db',
        'inspection','publishable','records','requires_manual_mapping',
        'sha256','source_claim','stable_official_record_id_verified'}
    if not isinstance(s,dict) or set(s)!=expected_schema:
        raise ValueError('Observed JSON schema-only fields changed')
    if (s['sha256']!=source_sha or s['columns']!=sorted(FIELDS) or
        type(s['records']) is not int or s['records']!=count or
        type(s['bytes']) is not int or not 1<=s['bytes']<=2_000_000 or
        s['format']!='json' or s['encoding']!='utf-8-sig' or
        s['inspection']!='SCHEMA_ONLY_NOT_AUTHENTICATED' or
        s['source_claim']!='NOT_PROVEN_BY_FILE_CONTENTS' or
        any(not _is_false(s[k]) for k in ('dataset_rights_verified',
            'correction_and_withdrawal_contract_verified','importable_to_live_db',
            'publishable','stable_official_record_id_verified')) or
        s['requires_manual_mapping'] is not True):
        raise ValueError('Receipt does not match verified private packet/rights status')
    # Only a bounded, non-sensitive receipt hash is used; no message fields escape.
    return {'window_start':start.isoformat(),'window_end_exclusive':end.isoformat(),
            'receipt_sha256':sha_json(receipt),'source_export_sha256':source_sha,
            'row_count':count,'repeated_payload_occurrences':sum(len(v)-1 for v in hashes.values())}


def _candidate_sha(entry: dict) -> str:
    return sha_json({k:v for k,v in entry.items() if k not in ('candidate_sha256','state')})


def _validate_history(existing: object) -> dict:
    if not isinstance(existing,dict) or set(existing)!={
        'schema_version','status','source_id','source_url','period_key',
        'window_start','window_end_exclusive','versions','publication_enabled',
        'supabase_stage_allowed','source_period_verified','official_event_identity_verified',
        'correction_contract_verified','rights_status','points_awarded','database_changes'}:
        raise ValueError('Unknown window history schema')
    if (type(existing['schema_version']) is not int or existing['schema_version']!=1 or
        existing['status']!='PRIVATE_DELIVERY_WINDOW_REVIEW_ONLY' or
        existing['source_id']!=SOURCE_ID or existing['source_url']!=SOURCE_URL or
        existing['publication_enabled'] is not False or
        existing['supabase_stage_allowed'] is not False or
        existing['source_period_verified'] is not False or
        existing['official_event_identity_verified'] is not False or
        existing['correction_contract_verified'] is not False or
        existing['rights_status']!='unverified' or
        existing['points_awarded'] is not False or existing['database_changes'] is not False):
        raise ValueError('Snapshot history flags cannot authorize publication')
    start=_day(existing['window_start']); end=_day(existing['window_end_exclusive'])
    if end-start!=timedelta(days=1) or existing['period_key']!=f'{SOURCE_ID}:{start.isoformat()}:{end.isoformat()}':
        raise ValueError('History day identity changed')
    versions=existing['versions']
    if not isinstance(versions,list) or not 1<=len(versions)<=MAX_VERSIONS:
        raise ValueError('Snapshot history must be non-empty and bounded')
    allowed={'version','source_export_sha256','receipt_sha256','row_count',
        'repeated_payload_occurrences','state','candidate_sha256',
        'snapshot_identity_type','rights_status','official_event_id_present',
        'automatic_correction_or_withdrawal','publishable'}
    prior_sources=set()
    for index,v in enumerate(versions):
        if not isinstance(v,dict) or set(v)!=allowed or type(v['version']) is not int or v['version']!=index+1:
            raise ValueError('Snapshot local version sequence changed')
        if not all(isinstance(v.get(k),str) and len(v[k])==64 and
              all(c in '0123456789abcdef' for c in v[k]) for k in
              ('source_export_sha256','receipt_sha256','candidate_sha256')):
            raise ValueError('Invalid snapshot hashes')
        if (type(v['row_count']) is not int or not 1<=v['row_count']<=20000 or
            type(v['repeated_payload_occurrences']) is not int or
            not 0<=v['repeated_payload_occurrences']<v['row_count'] or
            v['state']!=('pending_manual_review' if index==len(versions)-1 else 'superseded_review_history') or
            v['snapshot_identity_type']!='delivered_message_export_window_not_incident' or
            v['rights_status']!='unverified' or
            v['official_event_id_present'] is not False or
            v['automatic_correction_or_withdrawal'] is not False or
            v['publishable'] is not False or
            v['candidate_sha256']!=_candidate_sha(v)):
            raise ValueError('Snapshot version content/status corrupted')
        if v['source_export_sha256'] in prior_sources:
            raise ValueError('Replayed old source file must not become a new revision')
        prior_sources.add(v['source_export_sha256'])
    return existing


def create_or_revise(current_private_packet: dict, guarded_form_receipt: dict,
                     old: dict | None = None) -> tuple[dict, dict]:
    meta=verified_window_receipt(guarded_form_receipt,current_private_packet)
    start,end=meta['window_start'],meta['window_end_exclusive']
    period_key=f'{SOURCE_ID}:{start}:{end}'
    if old is None:
        state={'schema_version':1,'status':'PRIVATE_DELIVERY_WINDOW_REVIEW_ONLY',
            'source_id':SOURCE_ID,'source_url':SOURCE_URL,'period_key':period_key,
            'window_start':start,'window_end_exclusive':end,'versions':[],
            'publication_enabled':False,'supabase_stage_allowed':False,
            'source_period_verified':False,'official_event_identity_verified':False,
            'correction_contract_verified':False,'rights_status':'unverified',
            'points_awarded':False,'database_changes':False}
    else:
        state=deepcopy(_validate_history(old))
        if state['period_key']!=period_key:
            raise ValueError('Separate export window; no cross-period incident matching')
        last=state['versions'][-1]
        if last['source_export_sha256']==meta['source_export_sha256']:
            if last['receipt_sha256']!=meta['receipt_sha256'] or last['row_count']!=meta['row_count']:
                raise ValueError('Conflicting receipt for identical exported file')
            return state, {'status':'EXACT_SNAPSHOT_REPLAY_NOT_REWRITTEN',
                'local_versions':len(state['versions']),'row_count':last['row_count'],
                'published':False,'database_changes':False,'changed':False}
        if any(v['source_export_sha256']==meta['source_export_sha256'] for v in state['versions']):
            raise ValueError('Old source reappearance is NOT an official correction')
        if len(state['versions'])>=MAX_VERSIONS:
            raise ValueError('Too many local review versions')
        last['state']='superseded_review_history'
        # State changes are not part of immutable payload digest; no incident revision.
    v={
        'version':len(state['versions'])+1,
        'source_export_sha256':meta['source_export_sha256'],
        'receipt_sha256':meta['receipt_sha256'],
        'row_count':meta['row_count'],
        'repeated_payload_occurrences':meta['repeated_payload_occurrences'],
        'state':'pending_manual_review',
        'snapshot_identity_type':'delivered_message_export_window_not_incident',
        'rights_status':'unverified','official_event_id_present':False,
        'automatic_correction_or_withdrawal':False,'publishable':False,
    }
    v['candidate_sha256']=_candidate_sha(v)
    state['versions'].append(v)
    _validate_history(state)
    return state, {'status':'PRIVATE_WINDOW_VERSION_PENDING',
        'local_versions':len(state['versions']),'row_count':v['row_count'],
        'published':False,'database_changes':False,'changed':True}


def write_private_window(packet_file: Path, receipt_file: Path, history_file: Path) -> dict:
    p=_guard_path(packet_file,must_exist=True)
    r=_guard_path(receipt_file,must_exist=True,expected_dir=p.parent)
    h=_guard_path(history_file,must_exist=False,expected_dir=p.parent)
    if len({p,r,h})!=3:
        raise ValueError('Three distinct private files required')
    if r.stat().st_size>MAX_RECEIPT_BYTES or (h.exists() and h.stat().st_size>MAX_HISTORY_BYTES):
        raise ValueError('Receipt/history oversized')
    lock_path=h.parent/(h.name+'.lock')
    if lock_path.is_symlink():
        raise ValueError('Symlink lock not permitted')
    fd_lock=os.open(lock_path,os.O_RDWR|os.O_CREAT|getattr(os,'O_NOFOLLOW',0),0o600)
    try:
        if not stat.S_ISREG(os.fstat(fd_lock).st_mode) or os.fstat(fd_lock).st_nlink!=1:
            raise ValueError('Unsafe private lock file')
        os.fchmod(fd_lock,0o600)
        fcntl.flock(fd_lock,fcntl.LOCK_EX)
        # Read latest state only under the exclusive lock, preventing lost revisions.
        packet=json.loads(p.read_text(encoding='utf-8'))
        receipt=json.loads(r.read_text(encoding='utf-8'))
        old=json.loads(h.read_text(encoding='utf-8')) if h.exists() else None
        state,result=create_or_revise(packet,receipt,old)
        if not result['changed']:
            return result
        body=(json.dumps(state,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode('utf-8')
        if len(body)>MAX_HISTORY_BYTES:
            raise ValueError('History exceeds private size limit')
        fd,temp=tempfile.mkstemp(prefix='.police_window_',suffix='.json',dir=h.parent)
        try:
            with os.fdopen(fd,'wb') as writer:
                os.fchmod(writer.fileno(),0o600)
                writer.write(body);writer.flush();os.fsync(writer.fileno())
            os.replace(temp,h)
            os.chmod(h,0o600)
        finally:
            if os.path.exists(temp):os.unlink(temp)
        return result
    finally:
        fcntl.flock(fd_lock,fcntl.LOCK_UN)
        os.close(fd_lock)


def main() -> None:
    p=argparse.ArgumentParser(description='Nonpublic message-window version review only; never publish or stage')
    p.add_argument('--packet',type=Path,required=True)
    p.add_argument('--guarded-receipt',type=Path,required=True)
    p.add_argument('--history',type=Path,required=True)
    a=p.parse_args()
    print(json.dumps(write_private_window(a.packet,a.guarded_receipt,a.history),ensure_ascii=False,sort_keys=True))


if __name__=='__main__':main()
