"""Replay Tokyo/Kanagawa/Niigata review using frozen source and geocoder evidence."""
import hashlib
import json
from collections import Counter
from pathlib import Path

from import_aed_open_data import read_records, first_value
from import_nationwide_aed import compact, mark_duplicates
from prepare_bodik_aed_review import make_row
from build_aed_dev10_publication import build

ROOT = Path('data/aed_dev10b')


def short_ome_name(name):
    return compact(name).replace('青梅市立', '').replace('青梅市', '')


def main():
    manifest = json.loads((ROOT / 'sources.json').read_text())
    for filename, digest in manifest['evidence_hashes'].items():
        assert hashlib.sha256((ROOT / filename).read_bytes()).hexdigest() == digest, filename
    current = json.loads((ROOT / 'ome_current_table.json').read_text())
    geos = [json.loads(line) for line in (ROOT / 'hadano_geocoded.jsonl').read_text().splitlines()]
    baseline = manifest['production_baseline']
    for source in manifest['sources']:
        key = source['key']
        payload = (ROOT / source['snapshot']).read_bytes()
        assert hashlib.sha256(payload).hexdigest() == source['sha256']
        records = read_records(payload)
        assert len(records) == source['expected_raw']
        if key == 'hadano':
            assert len(records) == len(geos)
        rows, excluded = [], []
        for index, record in enumerate(records):
            name = first_value(record, ('名称',))
            address = first_value(record, ('所在地_連結表記', '住所'))
            location = first_value(record, ('設置位置',))
            reason = None
            coords = [record.get('経度'), record.get('緯度')]
            if key == 'ome':
                matches = [t for t in current if short_ome_name(name) == short_ome_name(t[0])
                    and compact(address).removeprefix('東京都青梅市') == compact(t[1])]
                if '貸出' in location:
                    reason = 'portable_loan_device_not_fixed_pin'
                elif len(matches) != 1:
                    reason = 'current_name_address_not_exactly_matched'
            elif key == 'hadano':
                geo = geos[index]
                assert geo['input'] == record['所在地_連結表記']
                if geo.get('level') != 8 or geo.get('lat') is None or geo.get('lon') is None:
                    reason = 'geocoder_below_address_level_8'
                elif geo.get('pref') != source['prefecture'] or geo.get('city') != source['municipality']:
                    reason = 'geocoder_administrative_mismatch'
                else:
                    coords = [geo['lon'], geo['lat']]
            elif key == 'ojiya':
                if name == '小千谷市立図書館':
                    reason = 'old_library_closed_or_relocated'
                elif '?' in address or '\ufffd' in address:
                    reason = 'unresolved_source_address_character'
            if reason:
                excluded.append(dict(row=index + 2, name=name, address=address, reason=reason))
                continue
            mapped = dict(name=name, address=address, prefectureName=source['prefecture'],
                cityName=source['municipality'], placeOfInstallation=location,
                telephoneNumber=record.get('電話番号'), limitationOfUse=record.get('外部利用不可'),
                openingDays=record.get('利用可能曜日'), startTime=record.get('開始時間'),
                endTime=record.get('終了時間'), openingHoursRemarks=record.get('利用可能日時特記事項'))
            row = make_row(mapped, coords, source, hashlib.sha256(source['resource_url'].encode()).hexdigest()[:16])
            assert row and row['municipality'] == source['municipality'], (key, index)
            if key == 'hadano':
                row['geocode_source'] = 'Geolonia住所正規化（位置情報レベル8）'
            south, north, west, east = source['review_bounds']
            assert south <= row['latitude'] <= north and west <= row['longitude'] <= east, (key, index)
            rows.append(row)
        pre_dedup_count = len(rows)
        rows, exact, near = mark_duplicates(rows)
        report = dict(source=source, raw_rows=len(records), pre_dedup_count=pre_dedup_count,
            review_rows=len(rows), exact_duplicates_removed=exact, internal_near_pairs=near,
            publish_candidates=sum(not r['duplicate_candidate'] for r in rows),
            excluded=excluded, excluded_by_reason=dict(Counter(x['reason'] for x in excluded)),
            holds=[dict(name=r['name'],address=r['address'],reason='internal_near_duplicate')
                for r in rows if r['duplicate_candidate']])
        (ROOT / (key + '_review.json')).write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
        (ROOT / (key + '_review_report.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        sql = build(source, rows, baseline)
        Path('scripts/publish_aed_dev10b_' + key + '_20260915.sql').write_text(sql)
        baseline += report['publish_candidates']
        print(key, report['publish_candidates'], 'candidates', len(report['holds']), 'holds',
              len(excluded), 'excluded', exact, 'exact duplicates removed')
    print('Expected final public AED:', baseline)


if __name__ == '__main__':
    main()
