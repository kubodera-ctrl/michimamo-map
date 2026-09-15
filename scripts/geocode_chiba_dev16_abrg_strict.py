#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import time
import urllib.parse
import urllib.request
from pathlib import Path

from import_aed_open_data import ADDRESS_FIELDS, NAME_FIELDS, PHONE_FIELDS, first_value, read_records

ROOT = Path('data/aed_dev14')
OUT = Path('data/aed_dev16_abr_strict')
TARGETS = {
    '12207': ('千葉県', '松戸市'),
    '12217': ('千葉県', '柏市'),
    '12221': ('千葉県', '八千代市'),
}


def geocode(address: str) -> dict | None:
    url = 'http://127.0.0.1:3000/geocode?' + urllib.parse.urlencode({
        'address': address,
        'target': 'residential',
        'format': 'json',
    })
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            payload = json.loads(r.read().decode('utf-8'))
        if not payload:
            return None
        return payload[0]
    except Exception:
        return None


def wait_server() -> None:
    for _ in range(60):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3000/health', timeout=2) as r:
                if r.status == 200:
                    return
        except Exception:
            time.sleep(1)
    raise RuntimeError('ABR geocoder server did not become healthy')


def process(code: str, prefecture: str, municipality: str, item: dict) -> None:
    dbdir = Path('/tmp') / f'abr-{code}'
    subprocess.run(['abrg', 'download', '-c', code, '-d', str(dbdir), '--silent'], check=True)
    subprocess.run(['abrg', 'serve', 'start', '-d', str(dbdir)], check=True)
    wait_server()
    try:
        rows = read_records(Path(item['snapshot']).read_bytes())
        accepted, held = [], []
        for idx, raw in enumerate(rows, 2):
            name = first_value(raw, NAME_FIELDS)
            address = first_value(raw, ADDRESS_FIELDS)
            if address and not address.startswith(prefecture):
                address = prefecture + (address if address.startswith(municipality) else municipality + address)
            if not name or not address:
                held.append({'row': idx, 'name': name, 'address': address, 'reason': 'missing_name_or_address'})
                continue
            result = geocode(address)
            r = (result or {}).get('result') or {}
            strict = (
                r.get('match_level') == 'residential_detail'
                and r.get('coordinate_level') == 'residential_detail'
                and float(r.get('score') or 0) >= 0.90
                and str(r.get('lg_code') or '') == code
                and not (r.get('others') or [])
                and r.get('lat') is not None and r.get('lon') is not None
            )
            if not strict:
                held.append({
                    'row': idx, 'name': name, 'address': address,
                    'reason': 'strict_residential_match_failed',
                    'score': r.get('score'), 'match_level': r.get('match_level'),
                    'coordinate_level': r.get('coordinate_level'), 'lg_code': r.get('lg_code'),
                    'others': r.get('others'),
                })
                continue
            accepted.append({
                'row': idx, 'name': name, 'address': address,
                'phone': first_value(raw, PHONE_FIELDS) or None,
                'latitude': float(r['lat']), 'longitude': float(r['lon']),
                'score': float(r['score']), 'match_level': r['match_level'],
                'coordinate_level': r['coordinate_level'], 'lg_code': r['lg_code'],
                'normalized_address': r.get('output'),
                'source_url': item.get('url'),
                'source_license': (item.get('selected_resource') or {}).get('license'),
                'source_updated_at': (item.get('selected_resource') or {}).get('updated_at'),
            })
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f'{code}_{municipality}_accepted.json').write_text(json.dumps(accepted, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (OUT / f'{code}_{municipality}_held.json').write_text(json.dumps(held, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (OUT / f'{code}_{municipality}_report.json').write_text(json.dumps({
            'code': code, 'prefecture': prefecture, 'municipality': municipality,
            'source_rows': len(rows), 'accepted': len(accepted), 'held': len(held),
            'policy': 'residential_detail only; coordinate_level residential_detail; score>=0.90; lg_code exact; others empty',
        }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(code, municipality, 'accepted', len(accepted), 'held', len(held), flush=True)
    finally:
        subprocess.run(['abrg', 'serve', 'stop'], check=False)


def main() -> None:
    catalog = json.loads((ROOT / 'catalog_fetch.json').read_text(encoding='utf-8'))
    by_code = {str(x.get('code')): x for x in catalog}
    for code, (pref, muni) in TARGETS.items():
        item = by_code.get(code)
        if not item or item.get('fetch_status') != 'downloaded':
            print(code, muni, 'skipped: source not downloaded', flush=True)
            continue
        process(code, pref, muni, item)

if __name__ == '__main__':
    main()
