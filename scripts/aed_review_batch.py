"""Emit a bounded, inactive staging INSERT from reconciled AED review JSON."""
import argparse
import json
from pathlib import Path

def staging_query(rows):
    columns=('source_key','facility_type','name','prefecture','prefecture_code','municipality','address','phone','latitude','longitude','source_name','source_url','source_license','source_date','source_updated_at','installation_location','availability','geocode_source','quality_status','active','duplicate_candidate')
    if not rows: raise ValueError('Empty batch')
    for row in rows:
        if row.get('active') is not False or row.get('duplicate_candidate') is not False or not row['source_key'].startswith('bodik-reviewed:'):
            raise ValueError('Only inactive, reconciled review rows can be staged')
    payload=json.dumps(rows,ensure_ascii=False)
    tag='$aed_review_20260914$'
    if tag in payload: raise ValueError('SQL delimiter in input')
    return 'insert into public.safety_spots_nationwide_stage ('+','.join(columns)+') select '+','.join('x.'+c for c in columns)+' from jsonb_populate_recordset(null::public.safety_spots_nationwide_stage,'+tag+payload+tag+'::jsonb) x on conflict (source_key) do nothing;'

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('file',type=Path);ap.add_argument('offset',type=int);ap.add_argument('--size',type=int,default=200);args=ap.parse_args()
    rows=json.loads(args.file.read_text())[args.offset:args.offset+args.size]
    print(json.dumps({'rows':len(rows),'query':staging_query(rows)},ensure_ascii=False))
