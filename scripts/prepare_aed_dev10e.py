"""Replay Shizuoka/Aichi/Mie reviews and independent guarded publication SQL."""
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from import_aed_open_data import read_records
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row
from build_aed_dev10_publication import build

ROOT = Path('data/aed_dev10e')


def normalized(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value)).replace('－', '-')


def main():
    manifest = json.loads((ROOT / 'sources.json').read_text())
    for filename, digest in manifest['evidence_hashes'].items():
        assert hashlib.sha256((ROOT / filename).read_bytes()).hexdigest() == digest
    current = json.loads((ROOT / 'tsu_current_rows.json').read_text())
    current_by_name = {}
    for row in current:
        if len(row) >= 4 and row[2] in ('屋外', '屋内'):
            key = normalized(row[0])
            assert key not in current_by_name, key
            current_by_name[key] = row
    baseline = manifest['production_baseline']
    for source in manifest['sources']:
        key = source['key']
        resource = source['resources'][0]
        payload = (ROOT / resource['snapshot']).read_bytes()
        assert hashlib.sha256(payload).hexdigest() == resource['sha256']
        records = read_records(payload)
        assert len(records) == resource['expected_raw']
        rows, excluded = [], []
        for index, record in enumerate(records):
            r = {k.split('※')[0]: v for k, v in record.items()}
            name = str(r.get('名称') or r.get('施設名') or '').strip()
            address = str(r.get('所在地_連結表記') or r.get('住所') or r.get('所在地') or '').strip()
            if key == 'tsu':
                address = '三重県津市' + address
            reason = None
            if not name or not address:
                reason = 'missing_name_address'
            elif r.get('外部利用不可') not in (None, '', '0', 'なし', '無'):
                reason = 'external_use_restricted'
            elif '当施設を利用時のみ' in str(r.get('利用可能日時特記事項') or ''):
                reason = 'facility_users_only'
            try:
                latitude, longitude = float(r['緯度']), float(r['経度'])
            except (ValueError, TypeError):
                reason = 'missing_or_invalid_coordinates'
                latitude, longitude = None, None
            if latitude is not None:
                south, north, west, east = source['review_bounds']
                if not (south <= latitude <= north and west <= longitude <= east):
                    reason = 'coordinates_outside_municipality_review_bounds'
            if key == 'tsu' and not reason:
                match = current_by_name.get(normalized(name))
                if match is None:
                    reason = 'name_not_exactly_confirmed_in_current_installation_list'
                else:
                    old = normalized(address.removeprefix('三重県'))
                    new = normalized(match[1])
                    if not new.startswith(old) or (len(new) > len(old) and new[len(old)].isdigit()):
                        reason = 'address_not_confirmed_in_current_installation_list'
            if reason:
                excluded.append(dict(row=index + 2, name=name, address=address, reason=reason))
                continue
            mapped = dict(name=name, address=address, prefectureName=source['prefecture'],
                          cityName=source['municipality'], placeOfInstallation=r.get('設置位置'),
                          telephoneNumber=r.get('電話番号'), openingDays=r.get('利用可能曜日'),
                          startTime=r.get('開始時間'), endTime=r.get('終了時間'),
                          openingHoursRemarks=r.get('利用可能日時特記事項'))
            row = make_row(mapped, [longitude, latitude], source,
                           hashlib.sha256(resource['url'].encode()).hexdigest()[:16])
            assert row and row['municipality'] == source['municipality'], (key, index)
            rows.append(row)
        rows, exact, near = mark_duplicates(rows)
        report = dict(source=source, raw_rows=len(records), review_rows=len(rows),
                      publish_candidates=sum(not r['duplicate_candidate'] for r in rows),
                      exact_duplicates_removed=exact, internal_near_pairs=near, excluded=excluded,
                      excluded_by_reason=dict(Counter(r['reason'] for r in excluded)),
                      holds=[r for r in rows if r['duplicate_candidate']], adjusted=[])
        for suffix, value in [('review', rows), ('review_report', report)]:
            (ROOT / f'{key}_{suffix}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
        Path(f'scripts/publish_aed_dev10e_{key}_20260915.sql').write_text(build(source, rows, baseline))
        baseline += report['publish_candidates']
        print(key, report['publish_candidates'], 'publish', len(report['holds']), 'hold', report['excluded_by_reason'])
    print('Expected public AED', baseline)


if __name__ == '__main__':
    main()
