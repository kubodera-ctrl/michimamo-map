"""R15: create an owner-only blank human review worksheet, all rows HOLD by default.

Never copies original police body or private recipient into this worksheet. The
row handles are private provenance identifiers, NOT police incident IDs.
"""
from __future__ import annotations
import argparse
import json
import os
import stat
from pathlib import Path

from mail_json_private_review import normalize_private_review, SOURCE_ID
from mail_identity_reconcile import _guard_path, _inspect_private
from mail_period_snapshot import _validate_history
from mail_manual_review_candidate import read_private_json, MAX_JSON_BYTES


def blank_template(original: bytes, packet: dict, history: dict) -> dict:
    def reject_duplicate_fields(items):
        result={}
        for key,value in items:
            if key in result:
                raise ValueError('Duplicate key in original mail JSON')
            result[key]=value
        return result
    try:
        json.loads(original.decode('utf-8-sig', errors='strict'), object_pairs_hook=reject_duplicate_fields)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Invalid original mail JSON') from exc
    actual = normalize_private_review(original)
    if packet != actual:
        raise ValueError('R9 review packet does not match the actual private original')
    _inspect_private(packet)
    _validate_history(history)
    latest = history['versions'][-1]
    if latest['source_export_sha256'] != actual['source_export_sha256'] or latest['row_count'] != len(actual['records']):
        raise ValueError('Latest R11 review window does not match source')
    return {
        'schema_version':1,'kind':'manual_police_mail_delivery_review','source_id':SOURCE_ID,
        'source_export_sha256':actual['source_export_sha256'],
        'window_start':history['window_start'],'window_end_exclusive':history['window_end_exclusive'],
        'window_version':latest['version'],'window_candidate_sha256':latest['candidate_sha256'],
        'reviewed_at':'','source_checked_at':'','privacy_checked_at':'',
        'correction_check_completed':False,
        'privacy_checklist':{
          'identifying_people_removed':False,'specific_locations_removed':False,
          'original_facts_preserved':False,'third_party_rights_checked':False,
          'official_source_current_checked':False,'editorial_attribution_checked':False},
        'records':[{'local_review_row_key':r['local_review_row_key'],'decision':'hold'}
                   for r in actual['records']]}


def write_blank_private_template(original: Path, packet: Path, window_history: Path,
                                 output: Path) -> dict:
    sources=[_guard_path(p,must_exist=True) for p in (original,packet,window_history)]
    dest=_guard_path(output,must_exist=False,expected_dir=sources[0].parent)
    if len(set(sources+[dest]))!=4 or any(f.parent!=dest.parent for f in sources):
        raise ValueError('Private template files must be distinct in one private directory')
    if dest.exists():
        raise ValueError('Do not overwrite a human review worksheet')
    for f in sources:
        if (not stat.S_ISREG(f.stat().st_mode) or f.stat().st_nlink!=1 or
            stat.S_IMODE(f.stat().st_mode)&0o077 or f.stat().st_size>MAX_JSON_BYTES):
            raise ValueError('Original/review/history inputs must be 0600 regular files')
    original_bytes=sources[0].read_bytes()
    template=blank_template(original_bytes,read_private_json(sources[1],MAX_JSON_BYTES),
                            read_private_json(sources[2],MAX_JSON_BYTES))
    body=(json.dumps(template,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
    if len(body)>500_000:
        raise ValueError('Too many private review rows; hold')
    # O_EXCL output, so an existing review can never be silently overwritten.
    fd=os.open(dest,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,'O_NOFOLLOW',0),0o600)
    try:
        with os.fdopen(fd,'wb') as fout:
            os.fchmod(fout.fileno(),0o600)
            fout.write(body);fout.flush();os.fsync(fout.fileno())
    except BaseException:
        if dest.exists():dest.unlink()
        raise
    return {'status':'PRIVATE_TEMPLATE_ALL_ROWS_HOLD','records_held':len(template['records']),
            'approved':0,'publication_enabled':False,'db_changed':False}


def main():
    cli=argparse.ArgumentParser(description='Private blank human-review worksheet; no event data or publishing')
    for key in ('original','packet','window_history','output'):
        cli.add_argument('--'+key.replace('_','-'),required=True,type=Path)
    args=cli.parse_args()
    print(json.dumps(write_blank_private_template(args.original,args.packet,args.window_history,args.output),
                     ensure_ascii=False,sort_keys=True))

if __name__=='__main__':main()
