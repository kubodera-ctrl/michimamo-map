"""Disposable-runner-only verification of EXACT 2026-09 police CSV schemas.

Only aggregates and SHA receipts are emitted. Never prints, uploads, or commits
incident-level data, coordinates or private demographic columns. Any mismatch
fails closed; user-visible publication is NOT enabled by this diagnostic.
"""
from __future__ import annotations
import argparse, json, tempfile
from pathlib import Path
from source_acquisition import inspect_header
from cumulative_sources import run

ROOT=Path(__file__).parent
PROFILE=json.loads((ROOT/'fixtures/keishicho_2026_09_verified_headers_ONLY.json').read_text(encoding='utf-8'))


def verify(private_dir:Path, *, profile=PROFILE)->dict:
    if not private_dir.name.endswith('private') or not private_dir.is_dir():
        raise ValueError('only disposable private directory allowed')
    result={'status':'SOURCE_MAPPING_REVIEW_ONLY','public_release':False,'production_changes':0,'datasets':{}}
    mapping_names={'precursor':'keishicho_2026_09_precursor_mapping_REVIEW_ONLY.json',
                   'town_stats':'keishicho_2026_09_town_mapping_REVIEW_ONLY.json'}
    for dataset,mapping in mapping_names.items():
        meta=profile[dataset]
        candidates=list(private_dir.glob(f"{dataset}-{meta['year']}-{meta['through_month']:02d}-{meta['sha256'][:12]}.csv"))
        if len(candidates)!=1 or candidates[0].is_symlink():
            raise ValueError(f'{dataset}: expected one private artifact from checked official URL')
        raw=candidates[0].read_bytes()
        receipt=inspect_header(raw)
        if any(receipt[key]!=meta[key] for key in ('sha256','encoding','bytes','rows')) or receipt['columns']!=meta['columns']:
            raise ValueError(f'{dataset}: source changed, explicit remapping and license review required')
        with tempfile.TemporaryDirectory(prefix='police_verified_private_') as t:
            work=Path(t)
            res=run(candidates[0],ROOT/'fixtures'/mapping,work/'snapshot.json',work/'receipt.json',
                dataset=dataset,year=meta['year'],through_month=meta['through_month'],encoding=meta['encoding'])
            snapshot=json.loads((work/'snapshot.json').read_text(encoding='utf-8'))
            if snapshot['publication_enabled'] is not False:
                raise RuntimeError('unsafe publication switch')
            latest=snapshot['releases'][-1]['records']
            if dataset=='precursor':
                total=sum(int(x['recognized_count_cumulative']) for x in latest)
                if total!=meta['rows']:
                    raise ValueError('source CSV row count mismatch; report not publishable')
            else:
                total=sum(1 for row in latest if row['crime_type']=='自転車盗')
                if total!=meta['rows']:
                    raise ValueError('source statistical area rows mismatch; report not publishable')
            result['datasets'][dataset]={
                'source_sha256':meta['sha256'], 'original_csv_rows':meta['rows'],
                'normalized_review_rows':len(latest),'row_coverage_pass':True,
                'publication_enabled':False,'rights_status':'unverified'
            }
    return result


def main():
    p=argparse.ArgumentParser(description='No production/DB, private CSV contract check only')
    p.add_argument('--private-dir',required=True,type=Path)
    a=p.parse_args()
    print(json.dumps(verify(a.private_dir),ensure_ascii=False,sort_keys=True))

if __name__=='__main__':main()
