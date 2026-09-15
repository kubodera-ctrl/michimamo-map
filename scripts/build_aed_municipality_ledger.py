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
    groups = read('published_groups_20260915.json')
    decision_groups = read('step2_decision_groups.json')
    source_groups = read('published_source_groups_20260915.json')
    official_audit_rows = read('official_source_audit_20260915.json')
    official_audit = {row['code']: row for row in official_audit_rows}
    assert len(official_audit_rows) == len(official_audit) == 1741
    assert set(official_audit) == {row['code'] for row in municipalities}
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
    decisions = collections.defaultdict(collections.Counter)
    unresolved_decision_groups = []
    reviewed_group_codes = collections.defaultdict(set)
    for row in mapping:
        reviewed_group_codes[(row['prefecture'], row['municipality'])].add(row['code'])
    source_info = collections.defaultdict(lambda: dict(urls=set(), licenses=set(), latest_dates=[]))
    unresolved_source_groups = []
    for group in source_groups:
        code = match(group['prefecture'], group['municipality'], municipalities)
        if not code:
            reviewed_codes = reviewed_group_codes[(group['prefecture'], group['municipality'])]
            if len(reviewed_codes) == 1:
                code = next(iter(reviewed_codes))
        if not code:
            unresolved_source_groups.append(group)
            continue
        if group.get('source_url'):
            source_info[code]['urls'].add(group['source_url'])
        source_info[code]['licenses'].update(group.get('licenses') or [])
        if group.get('latest_source_date'):
            source_info[code]['latest_dates'].append(group['latest_source_date'])
    assert not unresolved_source_groups, unresolved_source_groups
    for group in decision_groups:
        code = match(group['prefecture'], group['municipality'], municipalities)
        if not code:
            reviewed_codes = reviewed_group_codes[(group['prefecture'], group['municipality'])]
            if len(reviewed_codes) == 1:
                code = next(iter(reviewed_codes))
        if not code:
            unresolved_decision_groups.append(group)
            continue
        decisions[code][group['review_decision']] += group['n']
    assert not unresolved_decision_groups, unresolved_decision_groups
    ledger = []
    step3_labels = {
        'official_source_already_cataloged': '③公式AED情報源確認済み',
        'official_aed_page_found': '③公式AEDページ候補確認',
        'official_site_identified_source_not_confirmed': '③公式サイト特定・AED情報源未確認',
        'official_domain_search_failed': '③公式サイト特定・検索失敗',
        'audit_error': '③調査処理エラー',
    }
    for m in municipalities:
        d = decisions[m['code']]
        source = source_info[m['code']]
        audit = official_audit[m['code']]
        assert audit['local_government_code'] == m['local_government_code']
        assert audit['prefecture'] == m['prefecture'] and audit['municipality'] == m['municipality']
        reviewed = sum(d.values())
        holds = d['hold']
        ledger.append(dict(
            **m,
            public_aed_count=counts[m['code']],
            publication_status='掲載あり' if counts[m['code']] else '未掲載',
            investigation_status=step3_labels[audit['investigation_status']],
            investigation_result=audit['investigation_status'],
            official_site_url=audit['official_site_url'],
            source_url=audit.get('source_url') or (sorted(source['urls'])[0] if source['urls'] else None),
            source_url_count=len(source['urls']),
            source_licenses=sorted(source['licenses']),
            latest_source_date=max(source['latest_dates']) if source['latest_dates'] else None,
            reuse_status=audit.get('reuse_status'),
            acquisition_status=audit['acquisition_status'],
            blocker_reason=(f'取得済み候補{holds}件を保留（代表座標の衝突または近接名称候補）。{audit.get("blocker_reason", "")}'.rstrip('。') if holds else audit.get('blocker_reason')),
            next_action=('④で公式原本から施設単位の位置・設置状況を再確認' if holds else audit['next_action']),
            investigated_at=audit['investigated_at'],
            step2_candidate_count=reviewed,
            step2_published_count=d['published'],
            step2_duplicate_count=d['duplicate'],
            step2_hold_count=holds,
            updated_at='2026-09-15',
        ))
    published = sum(m['public_aed_count'] > 0 for m in ledger)
    total = sum(g['n'] for g in groups)
    assert sum(counts.values()) + len(unresolved) == total
    assert len({r['source_key'] for r in exceptions}) == len(exceptions)
    audit_counts = collections.Counter(row['investigation_status'] for row in official_audit_rows)
    summary = dict(snapshot_date='2026-09-15',scope=1741,published_municipalities=published,unpublished_municipalities=1741-published,public_aed_count=total,assigned_aed_count=sum(counts.values()),unresolved_aed_count=len(unresolved),raw_municipality_labels=len(groups),step2_candidate_count=sum(sum(v.values()) for v in decisions.values()),step2_published_count=sum(v['published'] for v in decisions.values()),step2_duplicate_count=sum(v['duplicate'] for v in decisions.values()),step2_hold_count=sum(v['hold'] for v in decisions.values()),step2_unreviewed_count=0,step2_reviewed_municipalities=sum(bool(v) for v in decisions.values()),step3_investigated_municipalities=len(official_audit),step3_uninvestigated_municipalities=0,step3_status_counts=dict(sorted(audit_counts.items())),master_sha256=hashlib.sha256((DATA/'municipality_master.json').read_bytes()).hexdigest())
    pref_summary=[]
    for pref in dict.fromkeys(m['prefecture'] for m in municipalities):
        local=[m for m in ledger if m['prefecture']==pref]
        n=sum(m['public_aed_count']>0 for m in local)
        pref_summary.append(dict(prefecture=pref,total=len(local),published=n,unpublished=len(local)-n,aeds=sum(m['public_aed_count'] for m in local)))
    write('ledger.json',ledger)
    write('reconciliation.json',mapping)
    write('unresolved.json',unresolved)
    write('summary.json',dict(**summary,prefectures=pref_summary))
    report = '# AED全国自治体台帳\n\n2026-09-15 本番公開データと②取得済み候補の照合結果。掲載ありはAEDが1件以上あることを示し、自治体内の網羅完了ではありません。未掲載は実際にAEDがないという意味ではありません。\n\n'
    report += f'対象 **1,741自治体**／掲載あり **{published}**／未掲載 **{1741-published}**。公開AED **{total:,}件**／所属未確定 **{len(unresolved)}件**。\n\n'
    report += f"②取得済み候補 **{summary['step2_candidate_count']:,}件**は全件判定済み（公開 **{summary['step2_published_count']:,}件**／重複除外 **{summary['step2_duplicate_count']:,}件**／保留 **{summary['step2_hold_count']:,}件**／未判定 **0件**）。③は全 **{summary['step3_investigated_municipalities']:,}自治体**を調査済み（既存公式AED情報源 **{audit_counts['official_source_already_cataloged']:,}自治体**／公式サイト特定・AED情報源未確認 **{audit_counts['official_site_identified_source_not_confirmed']:,}自治体**／未調査 **0自治体**）です。\n\n"
    report += '## 都道府県別\n\n| 都道府県 | 対象 | 掲載あり | 未掲載 | 公開AED |\n|---|---:|---:|---:|---:|\n'
    for p in pref_summary:
        report += f"| {p['prefecture']} | {p['total']} | {p['published']} | {p['unpublished']} | {p['aeds']} |\n"
    report += '\n## 自治体別・全件\n\n| 自治体コード（6桁） | 都道府県 | 自治体 | 掲載状況 | 公開AED | ②候補 | 公開判定 | 重複除外 | 保留 | ③調査状態 |\n|---|---|---|---|---:|---:|---:|---:|---:|---|\n'
    for m in ledger:
        report += f"| {m['local_government_code']} | {m['prefecture']} | {m['municipality']} | {m['publication_status']} | {m['public_aed_count']} | {m['step2_candidate_count']} | {m['step2_published_count']} | {m['step2_duplicate_count']} | {m['step2_hold_count']} | {m['investigation_status']} |\n"
    (DATA/'LEDGER.md').write_text(report)
    print(json.dumps(summary,ensure_ascii=False,indent=2))
