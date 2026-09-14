"""Rebuild the AED municipality ledger from frozen official and DB snapshots.

No DB writes or coordinate changes. Run from the repository root.
"""
import collections
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/aed_municipality_audit'

def read(name):
    return json.loads((DATA / name).read_text())

def write(name, value):
    (DATA / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def master():
    source = (DATA / 'gsi_muni_20260914.js').read_text()
    municipalities = []
    for prefcode, pref, code, name in [v.split(',') for v in re.findall(r"= '([^']+)'", source)]:
        code = code.zfill(5)
        # Administrative wards are rolled up to their parent city.
        # Northern Territories six villages are outside the agreed 1,741 scope.
        # GSI retains obsolete Tomiya code 04423; current code is 04216 (J-LIS).
        if '　' in name or '01695' <= code <= '01700' or code == '04423':
            continue
        check = 11 - sum(int(d) * w for d, w in zip(code, [6,5,4,3,2])) % 11
        check %= 10  # J-LIS modulus 11: use the units digit of 11 - remainder.
        municipalities.append(dict(code=code, local_government_code=code+str(check), prefecture=pref, municipality=name))
    assert len(municipalities) == 1741
    assert len({m['code'] for m in municipalities}) == 1741
    assert len({(m['prefecture'], m['municipality']) for m in municipalities}) == 1741
    return sorted(municipalities, key=lambda m:m['code'])

def match(pref, text, municipalities):
    text = re.sub(r'\s+', '', text or '')
    if text.startswith(pref):
        text = text[len(pref):]
    # Longest official prefix: 四日市市 and 大和郡山市 must not be split.
    candidates = [m for m in municipalities if m['prefecture'] == pref and text.startswith(m['municipality'])]
    if candidates:
        return max(candidates, key=lambda m:len(m['municipality']))['code']
    # Only accept a county prefix ending in 郡, followed by an official town/village.
    candidates = [m for m in municipalities if m['prefecture'] == pref and m['municipality'].endswith(('町','村')) and re.match(r'^.+郡'+re.escape(m['municipality']), text)]
    return candidates[0]['code'] if len(candidates) == 1 else None

if __name__ == '__main__':
    municipalities = master()
    write('municipality_master.json', municipalities)
    groups = read('published_groups.json')
    exceptions = read('exception_rows.json')
    overrides = {r['source_key']:r for r in read('reviewed_overrides.json')}
    counts = collections.Counter()
    unresolved = []
    mapping = []
    for g in groups:
        code = match(g['prefecture'], g['municipality'], municipalities)
        if code:
            counts[code] += g['n']
            mapping.append(dict(**g, code=code, method='official_name_prefix'))
            continue
        rows = [r for r in exceptions if (r['prefecture'],r['municipality']) == (g['prefecture'],g['municipality'])]
        assert len(rows) == g['n'], g
        for r in rows:
            code = match(r['prefecture'], r['address'], municipalities)
            method = 'address_official_name_prefix'
            if not code and r['source_key'] in overrides:
                review = overrides[r['source_key']]
                assert review['address'] == r['address']
                code = review['code']
                assert any(m['code']==code and m['prefecture']==r['prefecture'] for m in municipalities)
                method = 'reviewed_source_evidence'
            if code:
                counts[code] += 1
                mapping.append(dict(prefecture=r['prefecture'],municipality=r['municipality'],n=1,code=code,method=method,source_key=r['source_key']))
            else:
                unresolved.append(r)
    ledger = [dict(**m, public_aed_count=counts[m['code']], publication_status='掲載あり' if counts[m['code']] else '未掲載', investigation_status='未棚卸し', source_url=None, acquisition_status='未判定', blocker_reason=None, next_action='②取得済み候補との照合・③情報源の棚卸し', updated_at='2026-09-14') for m in municipalities]
    published = sum(m['public_aed_count'] > 0 for m in ledger)
    total = sum(g['n'] for g in groups)
    assert sum(counts.values()) + len(unresolved) == total
    assert len({r['source_key'] for r in exceptions}) == len(exceptions)
    summary = dict(snapshot_date='2026-09-14',scope=1741,published_municipalities=published,unpublished_municipalities=1741-published,public_aed_count=total,assigned_aed_count=sum(counts.values()),unresolved_aed_count=len(unresolved),raw_municipality_labels=len(groups),master_sha256=hashlib.sha256((DATA/'municipality_master.json').read_bytes()).hexdigest())
    pref_summary=[]
    for pref in dict.fromkeys(m['prefecture'] for m in municipalities):
        local=[m for m in ledger if m['prefecture']==pref]
        n=sum(m['public_aed_count']>0 for m in local)
        pref_summary.append(dict(prefecture=pref,total=len(local),published=n,unpublished=len(local)-n,aeds=sum(m['public_aed_count'] for m in local)))
    write('ledger.json',ledger)
    write('reconciliation.json',mapping)
    write('unresolved.json',unresolved)
    write('summary.json',dict(**summary,prefectures=pref_summary))
    report = '# AED全国自治体台帳\n\n2026-09-14 本番公開データの照合結果。掲載ありはAEDが1件以上あることを示し、自治体内の網羅完了ではありません。未掲載は実際にAEDがないという意味ではありません。\n\n'
    report += f'対象 **1,741自治体**／掲載あり **{published}**／未掲載 **{1741-published}**。公開AED **{total:,}件**／所属未確定 **{len(unresolved)}件**。\n\n'
    report += '取得済み候補・情報源の棚卸しは②③で行います。調査状態は、過去の取得実績を未調査と誤認しないよう「未棚卸し」から開始します。\n\n'
    report += '## 都道府県別\n\n| 都道府県 | 対象 | 掲載あり | 未掲載 | 公開AED |\n|---|---:|---:|---:|---:|\n'
    for p in pref_summary:
        report += f"| {p['prefecture']} | {p['total']} | {p['published']} | {p['unpublished']} | {p['aeds']} |\n"
    report += '\n## 自治体別・全件\n\n| 自治体コード（6桁） | 都道府県 | 自治体 | 掲載状況 | 公開AED |\n|---|---|---|---|---:|\n'
    for m in ledger:
        report += f"| {m['local_government_code']} | {m['prefecture']} | {m['municipality']} | {m['publication_status']} | {m['public_aed_count']} |\n"
    (DATA/'LEDGER.md').write_text(report)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
