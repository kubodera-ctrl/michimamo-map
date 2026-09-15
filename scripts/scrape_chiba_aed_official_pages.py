#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

OUT = Path('data/aed_dev16_chiba_pages')
UA = 'machimamo-map-aed-source-audit/2026-09-16'
SOURCES = [
    {
        'code':'12220','municipality':'流山市',
        'url':'https://www.city.nagareyama.chiba.jp/institution/1005119/index.html',
        'license':'official-page-review-required'
    },
    {
        'code':'12210','municipality':'茂原市',
        'url':'https://www.city.mobara.chiba.jp/0000001282.html',
        'license':'CC BY (city open-data terms unless otherwise stated)'
    },
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept':'text/html,*/*'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def clean(s: str) -> str:
    return ' '.join(s.replace('\u3000',' ').split())


def parse_tables(html: bytes):
    soup = BeautifulSoup(html, 'html.parser')
    tables = []
    for ti, table in enumerate(soup.find_all('table'), 1):
        rows = []
        for tr in table.find_all('tr'):
            cells = [clean(c.get_text(' ', strip=True)) for c in tr.find_all(['th','td'])]
            if any(cells): rows.append(cells)
        if rows: tables.append({'index':ti,'rows':rows})
    links = []
    for a in soup.find_all('a', href=True):
        text = clean(a.get_text(' ', strip=True))
        href = a.get('href')
        if text and ('AED' in text or '設置' in text or '施設' in text):
            links.append({'text':text,'href':href})
    return tables, links


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    report=[]
    for src in SOURCES:
        payload=fetch(src['url'])
        tables,links=parse_tables(payload)
        item={**src,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),
              'table_count':len(tables),'table_row_counts':[len(t['rows']) for t in tables],
              'tables':tables,'aed_links':links[:300]}
        (OUT/f"{src['code']}_{src['municipality']}.json").write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        report.append({k:item[k] for k in ('code','municipality','url','bytes','sha256','table_count','table_row_counts')})
        print(src['code'],src['municipality'],'tables',len(tables),'rows',[len(t['rows']) for t in tables],flush=True)
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__': main()
