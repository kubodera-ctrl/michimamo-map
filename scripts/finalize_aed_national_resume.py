"""Reconcile production evidence to all 1,741 municipalities and retain actionable work."""
import hashlib
import json
from collections import Counter
from pathlib import Path
from build_aed_municipality_ledger import match

P = Path('data/aed_national_resume')
A = Path('data/aed_municipality_audit')

def read(path):
    return json.loads(path.read_text())

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def main():
    master = read(A / 'municipality_master.json')
    groups = read(P / 'public_groups_after.json')
    exceptions = read(A / 'exception_rows.json')
    overrides = {r['source_key']: r for r in read(A / 'reviewed_overrides.json')}
    counts = Counter()
    for g in groups:
        code = match(g['prefecture'], g['municipality'], master)
        if code:
            counts[code] += g['count']
        else:
            rows = [r for r in exceptions if r['prefecture'] == g['prefecture'] and r['municipality'] == g['municipality']]
            assert len(rows) == g['count'], g
            for r in rows:
                code = match(r['prefecture'], r['address'], master) or overrides[r['source_key']]['code']
                assert code
                counts[code] += 1
    manifest = read(P / 'sources.json')
    reports = read(P / 'review_reports.json')
    runs = read(P / 'production_runs.json')
    rpc = {r['key']: r['count'] for r in read(P / 'anon_rpc_results.json')}
    totals = read(P / 'production_totals.json')[0]
    inserted = sum(r['publish_candidates'] for r in reports)
    assert len(master) == 1741 and len(counts) == 469
    assert sum(counts.values()) == totals['public_aed'] == manifest['production_baseline'] + inserted
    assert len(runs) == len(read(P / 'batch_index.json')) == 18
    assert sum(r['inserted'] for r in runs) == inserted
    assert sum(r['held'] for r in runs) == sum(r['held'] for r in reports)
    for r in reports:
        assert rpc[r['key']] == r['publish_candidates']
        assert r['raw_rows'] == r['publish_candidates'] + r['held'] + r['exact_removed'] + len(r['excluded'])
    for r in runs:
        assert r['rehearsal'] == 'passed' and r['commit']['public_aed'] == r['baseline'] + r['inserted']
        assert hashlib.sha256((P / r['file']).read_bytes()).hexdigest() == r['sql_sha256']
    write(P / 'municipality_counts_after.json', counts)
    profiles = read(P / 'candidate_profiles.json')
    old = {r['code']: r for r in read(A / 'official_source_audit_20260915.json')}
    queue = []
    for m in master:
        candidates = [p for p in profiles if p.get('code') == m['code']]
        count = counts[m['code']]
        if count:
            state, action, priority = 'published_aed_present', '追加情報源・未公開行・更新日を照合。自治体内の全AED網羅は未確認', 3
        elif candidates:
            state, action, priority = 'candidate_processing_required', '候補ごとの処理理由を解消し、利用条件・自治体・座標・重複を検証して一括投入', 1
        else:
            state, action, priority = 'source_discovery_required', '県域一括データ・自治体公式AED一覧・消防広域連合を全国横断で探索。情報源未確認を不存在と扱わない', 2
        queue.append(dict(**m, public_aed_count=count, status=state, priority=priority,
            official_site_url=old[m['code']].get('official_site_url'),
            candidates=[dict(dataset=c['dataset'], source_url=c['source_url'], resource_url=c.get('resource_url'), processing_status=c['processing_status']) for c in candidates],
            next_action=action, all_facilities_coverage='unconfirmed', updated_at='2026-09-15'))
    write(P / 'municipality_queue.json', queue)
    states = dict(Counter(r['status'] for r in queue))
    exceptions_log = []
    for r in reports:
        exceptions_log.extend(dict(prefecture=r['prefecture'],municipality=r['municipality'],source_key=r['key'],**x) for x in r['excluded'])
        for row in read(P / (r['key'] + '_review.json')):
            if row['duplicate_candidate']:
                exceptions_log.append(dict(prefecture=r['prefecture'],municipality=r['municipality'],source_key=row['source_key'],name=row['name'],address=row['address'],reason='staging_duplicate_hold'))
    write(P / 'row_exceptions.json', exceptions_log)
    summary = dict(date='2026-09-15',strategy='全国一括調査 → 処理可能データの大量公開 → 残った例外の解決',
        before_public_aed=manifest['production_baseline'],after_public_aed=totals['public_aed'],inserted=inserted,
        newly_published_municipalities=15,published_municipalities=len(counts),unpublished_municipalities=len(master)-len(counts),
        new_staging_holds=sum(r['held'] for r in reports),staging_holds=totals['holds'],excluded_rows=sum(len(r['excluded']) for r in reports),
        queue_states=states,validation='18件の独立トランザクションはrollback検証・公開重複/件数ガード通過。15自治体のanon地図RPC取得件数一致。全公開AEDを公式自治体コードに割当。',
        completion_note='未掲載自治体ゼロは未達。掲載ありは1件以上の意味で、全施設の網羅ではない。情報源未確認や利用条件未解決を完了扱いにしない。',sources=reports)
    write(Path('data/import_reports/20260915_aed_national_bulk_publication.json'), summary)
    lines=['# AED 47都道府県進捗（開発10・全国一括処理第1波・2026-09-15）','',
        '掲載ありは公式自治体コードごとに公開中AEDが1件以上あること。自治体内の全AEDを網羅した意味ではない。','',
        '- 対象自治体: 1,741',f'- 掲載あり: {len(counts):,}',f'- 未掲載: {len(master)-len(counts):,}',
        f"- 公開AED: {totals['public_aed']:,}件",f"- 保留候補（ステージング）: {totals['holds']}件",'',
        '| 都道府県 | 対象 | 掲載あり | 未掲載 | 公開AED |','|---|---:|---:|---:|---:|']
    for pref in dict.fromkeys(m['prefecture'] for m in master):
        ms=[m for m in master if m['prefecture']==pref];n=sum(counts[m['code']]>0 for m in ms);total=sum(counts[m['code']] for m in ms)
        lines.append(f'| {pref} | {len(ms)} | {n} | {len(ms)-n} | {total:,} |')
    lines += ['', '## 全国一括処理第1波', '',f'{inserted:,}件を15自治体へ追加。3県ごとに1自治体を選ぶ進め方は終了し、全国の未掲載自治体から処理可能な情報源をまとめて公開する。', '',
        '| 都道府県 | 自治体 | 今回公開 | 新規保留 |','|---|---|---:|---:|']
    lines += [f"| {r['prefecture']} | {r['municipality']} | {r['publish_candidates']} | {r['held']} |" for r in reports]
    lines += ['', '## 残りの進め方', '',
        f"未掲載{len(master)-len(counts):,}自治体のうち、今回のカタログ候補と紐付いた{states['candidate_processing_required']}自治体を優先処理。残り{states['source_discovery_required']:,}自治体は情報源探索を継続。候補があることは公開可能を意味しない。",
        '全国BODIK検索196データセットを全件取得・照合し、未掲載40自治体45データセットを抽出。島根・岡山・鳥取の県域カタログも照合。岡山は取得した検索一覧ページ分で、全ページ調査完了ではない。全国の公式サイト再調査完了を意味しない。',
        '利用条件未確認、住所/座標補完、形式変換、対象リソース選択、再取得、重複候補を分ける。情報源未確認や公開不可を完了扱いにしない。',
        '管理表: `data/aed_national_resume/municipality_queue.json`。候補詳細: `candidate_profiles.json`。除外・保留: `row_exceptions.json`。','',
        '## 検証', '', summary['validation'],
        '施設の利用可能時間と出典更新日を保持。出典更新日は現地調査日や現在の稼働保証ではない。貸出専用・外部利用不可・座標不整合等は公開対象から除外。','']
    Path('data/import_reports/20260915_aed_47_prefecture_progress.md').write_text('\n'.join(lines))
    roadmap=Path('ROADMAP.md');text=roadmap.read_text();header='# 開発10 AED全国一括処理（2026-09-15）'
    if text.startswith(header):text=text.split('\n<!-- national-bulk-end -->\n',1)[1]
    intro=f"""{header}

進め方を「全国一括調査 → 処理可能データの大量公開 → 残った例外の解決」へ変更。3県ごとに1自治体を選ぶ運用は終了。

第1波は15自治体・{inserted:,}件を本番公開。全国{totals['public_aed']:,}件、掲載{len(counts)}/1,741自治体、未掲載{len(master)-len(counts):,}。新規保留{summary['new_staging_holds']}件、累計保留{totals['holds']}件。18独立トランザクションとanon地図RPCで検証済み。

全国管理表を全1,741自治体について本番実数から再集計。未掲載の候補あり{states['candidate_processing_required']}自治体を優先処理し、情報源未確認{states['source_discovery_required']:,}自治体の探索を並行して進める。公開件数だけでなく未掲載自治体の減少で進捗を測る。全自治体への反映が目標で、情報源未確認・利用条件未解決を完了扱いにしない。掲載ありは1件以上であり、全施設網羅は別途未確認。

記録: `data/import_reports/20260915_aed_national_bulk_publication.json`。再開入口: `data/aed_national_resume/README.md`。

以下は過去の実績。過去の「次の3県」指定は今回の全国方式で置き換える。
<!-- national-bulk-end -->
"""
    roadmap.write_text(intro+text)
    print(json.dumps({k:v for k,v in summary.items() if k!='sources'},ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
