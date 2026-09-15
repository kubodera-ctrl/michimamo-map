#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

import xlrd

OUT = Path('data/aed_dev16_narashino')
USER_AGENT = 'machimamo-map-aed-source-audit/2026-09-16'
SOURCES = [
    {
        'key': 'school',
        'title': 'AED設置場所（学校等）',
        'source_url': 'https://www.city.narashino.lg.jp/soshiki/johokanri/gyomu/keikaku/somu/open_data.html',
        'download_url': 'https://www.city.narashino.lg.jp/material/files/group/31/aed_school_20250508.xls',
        'license': 'CC BY 2.1 Japan',
    },
    {
        'key': 'other',
        'title': 'AED設置場所（その他）',
        'source_url': 'https://www.city.narashino.lg.jp/soshiki/johokanri/gyomu/keikaku/somu/open_data.html',
        'download_url': 'https://www.city.narashino.lg.jp/material/files/group/31/aed_sonota20250918.xls',
        'license': 'CC BY 2.1 Japan',
    },
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=45) as response:
        return response.read()


def normalize(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.endswith('.0') and text[:-2].isdigit():
        return text[:-2]
    return text


def rows_from_xls(payload: bytes):
    book = xlrd.open_workbook(file_contents=payload)
    sheets = []
    for sheet in book.sheets():
        nonempty = []
        for r in range(sheet.nrows):
            vals = [normalize(sheet.cell_value(r, c)) for c in range(sheet.ncols)]
            if any(v is not None for v in vals):
                nonempty.append(vals)
        sheets.append({'name': sheet.name, 'rows': nonempty})
    return sheets


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'municipality_code': '12216', 'prefecture': '千葉県', 'municipality': '習志野市', 'sources': []}
    for src in SOURCES:
        payload = fetch(src['download_url'])
        target = OUT / f"{src['key']}.xls"
        target.write_bytes(payload)
        sheets = rows_from_xls(payload)
        parsed_path = OUT / f"{src['key']}_parsed.json"
        parsed_path.write_text(json.dumps(sheets, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        report['sources'].append({
            **src,
            'bytes': len(payload),
            'sha256': hashlib.sha256(payload).hexdigest(),
            'sheet_count': len(sheets),
            'sheet_names': [s['name'] for s in sheets],
            'row_counts': [len(s['rows']) for s in sheets],
            'first_rows': [s['rows'][:6] for s in sheets],
            'status': 'downloaded_and_parsed',
        })
        print(src['key'], len(payload), [(s['name'], len(s['rows'])) for s in sheets], flush=True)
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
