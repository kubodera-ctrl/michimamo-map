"""Replay reviewed municipal CSV snapshots; emit separate prefecture batches.

Run with the repository's Python dependencies, from its root.
This command only generates review files; it never connects to production.
"""
import hashlib
import json
from pathlib import Path

from import_aed_open_data import first_value, read_records
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row

ROOT = Path('data/aed_dev10')


def main():
    for source in json.loads((ROOT / 'sources.json').read_text())['sources']:
        key = source['key']
        payload = (ROOT / 'raw' / (key + '.csv')).read_bytes()
        assert hashlib.sha256(payload).hexdigest() == source['sha256'], key + ': snapshot changed'
        records = read_records(payload)
        assert len(records) == source['expected_raw'], key + ': row count changed'
        rows, excluded = [], []
        for index, record in enumerate(records, 2):
            address = first_value(record, ('所在地_連結表記', '所在地_連結標記'))
            if source.get('require_address_prefix') and not address.startswith(source['require_address_prefix']):
                excluded.append({'row': index, 'name': record['名称'], 'reason': 'outside_target_municipality', 'address': address})
                continue
            mapped = dict(name=record['名称'], address=address,
                prefectureName=source['prefecture'], cityName=source['municipality'],
                placeOfInstallation=record.get('設置位置'), telephoneNumber=record.get('電話番号'),
                limitationOfUse=record.get('外部利用不可'), openingDays=record.get('利用可能曜日'),
                startTime=record.get('開始時間'), endTime=record.get('終了時間'),
                openingHoursRemarks=first_value(record, ('利用可能日時特記事項', '利用可能時間特記事項')))
            row = make_row(mapped, [record['経度'], record['緯度']], source,
                hashlib.sha256(source['resource_url'].encode()).hexdigest()[:16])
            assert row is not None and row['municipality'] == source['municipality'], (key, index)
            if source.get('phone_is_publisher_contact'):
                row['phone'] = None
            south, north, west, east = source['review_bounds']
            assert south <= row['latitude'] <= north and west <= row['longitude'] <= east, (key, index)
            rows.append(row)
        rows, exact, near = mark_duplicates(rows)
        assert exact == 0, 'Review exact duplicates before discarding source rows'
        output = ROOT / (key + '_review.json')
        output.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
        report = dict(source=source, raw_rows=len(records), review_rows=len(rows),
            publish_candidates=sum(not r['duplicate_candidate'] for r in rows),
            internal_near_duplicate_pairs=near, excluded=excluded,
            holds=[{'name': r['name'], 'address': r['address'], 'reason': 'internal_near_duplicate'}
                for r in rows if r['duplicate_candidate']])
        (ROOT / (key + '_review_report.json')).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(key, report['publish_candidates'], 'candidates;', len(report['holds']), 'holds;', len(excluded), 'excluded')


if __name__ == '__main__':
    main()
