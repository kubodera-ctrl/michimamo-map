"""Replay separately reviewed Toyama/Ishikawa/Fukui publication from frozen evidence."""
import csv
import hashlib
import io
import json
from collections import Counter
from pathlib import Path
from import_aed_open_data import read_records
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row
from build_aed_dev10_publication import build

ROOT = Path('data/aed_dev10c')

def main():
    manifest = json.loads((ROOT / 'sources.json').read_text())
    for filename, digest in manifest['evidence_hashes'].items():
        assert hashlib.sha256((ROOT / filename).read_bytes()).hexdigest() == digest, filename
    baseline = manifest['production_baseline']
    for s in manifest['sources']:
        key = s['key']
        payload = (ROOT / s['snapshot']).read_bytes()
        assert hashlib.sha256(payload).hexdigest() == s['sha256']
        if key == 'kawakita':
            raw = list(csv.reader(io.StringIO(payload.decode('utf-8-sig'))))
            assert len(raw) == 25 and all(len(r) == 29 for r in raw)
            assert raw[0][1] == 'FF17324001' and raw[0][4] == '川北町立川北中学校'
            records = []
            for r in raw:
                if r[4]:
                    assert r[0] == r[7] == '173240' and r[2] == '石川県' and r[3] == '川北町'
                records.append(dict(名称=r[4],住所=r[8],緯度=r[14],経度=r[15],設置位置=r[16],
                    電話番号=r[17],利用可能曜日=r[20],開始時間=r[21],終了時間=r[22],利用可能日時特記事項=r[23]))
        else:
            records = read_records(payload)
        assert len(records) == s['expected_raw']
        geos = [json.loads(l) for l in (ROOT / 'namerikawa_geocoded.jsonl').read_text().splitlines()] if key == 'namerikawa' else []
        if geos: assert len(geos) == len(records)
        rows, excluded = [], []
        for i, r in enumerate(records):
            name, address = r['名称'].strip(), r['住所'].strip()
            if address and not address.startswith(s['prefecture']): address = s['prefecture'] + address
            reason = None
            coords = [r['経度'], r['緯度']]
            if not name or not address:
                reason = 'blank_facility_row'
            elif key == 'namerikawa' and name == 'タラソピア':
                reason = 'facility_closed_2023_07_05'
            elif key == 'namerikawa':
                g = geos[i]
                assert g['input'] == address
                if g.get('level') != 8 or g.get('lat') is None or g.get('lon') is None:
                    reason = 'geocoder_below_address_level_8'
                elif g.get('pref') != s['prefecture'] or g.get('city') != s['municipality']:
                    reason = 'geocoder_administrative_mismatch'
                else: coords = [g['lon'], g['lat']]
            elif key == 'kawakita' and name in ('川北町児童館', '川北町立川北保育所'):
                reason = 'same_address_coordinates_disagree_over_300m'
            elif not all(coords):
                reason = 'missing_official_coordinates'
            if reason:
                excluded.append(dict(row=i + (1 if key == 'kawakita' else 2),name=name,address=address,reason=reason))
                continue
            mapped = dict(name=name,address=address,prefectureName=s['prefecture'],cityName=s['municipality'],
                placeOfInstallation=r.get('設置位置'),telephoneNumber=r.get('電話番号'),
                openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),
                openingHoursRemarks=r.get('利用可能日時特記事項'))
            row = make_row(mapped,coords,s,hashlib.sha256(s['resource_url'].encode()).hexdigest()[:16])
            assert row and row['municipality'] == s['municipality'], (key,i,row)
            south,north,west,east = s['review_bounds']
            assert south <= row['latitude'] <= north and west <= row['longitude'] <= east, (key,i)
            if key == 'namerikawa': row['geocode_source'] = 'Geolonia住所正規化（位置情報レベル8）'
            rows.append(row)
        rows,exact,near = mark_duplicates(rows)
        report = dict(source=s,raw_rows=len(records),review_rows=len(rows),publish_candidates=sum(not r['duplicate_candidate'] for r in rows),
            exact_duplicates_removed=exact,internal_near_pairs=near,excluded=excluded,
            excluded_by_reason=dict(Counter(r['reason'] for r in excluded)),holds=[r for r in rows if r['duplicate_candidate']])
        for suffix,value in [('review',rows),('review_report',report)]:
            (ROOT / f'{key}_{suffix}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        Path(f'scripts/publish_aed_dev10c_{key}_20260915.sql').write_text(build(s,rows,baseline))
        baseline += report['publish_candidates']
        print(key,report['publish_candidates'],'publish',len(report['holds']),'hold',report['excluded_by_reason'])
    print('Expected public AED',baseline)

if __name__ == '__main__': main()
