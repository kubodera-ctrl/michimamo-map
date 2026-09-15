"""Reconcile production evidence and keep every municipality and exception actionable."""
import json,hashlib
from pathlib import Path
from collections import Counter
from build_aed_municipality_ledger import match
P=Path('data/aed_dev11');A=Path('data/aed_municipality_audit');waves=[P,Path('data/aed_dev11_regional'),Path('data/aed_dev11_geocoded')]
def read(p):return json.loads(p.read_text())
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def main():
 master=read(A/'municipality_master.json');groups=read(P/'public_groups_after.json');counts=Counter();exceptions=read(A/'exception_rows.json');overrides={r['source_key']:r for r in read(A/'reviewed_overrides.json')}
 for g in groups:
  code=match(g['prefecture'],g['municipality'],master)
  if code:counts[code]+=g['count']
  else:
   rows=[r for r in exceptions if r['prefecture']==g['prefecture'] and r['municipality']==g['municipality']];assert len(rows)==g['count'],g
   for r in rows:counts[match(r['prefecture'],r['address'],master) or overrides[r['source_key']]['code']]+=1
 reports=[];runs=[];new_codes=set();held=0;excluded=[]
 for wave in waves:
  rr=read(wave/'review_reports.json');reports.extend(dict(wave=str(wave),**r) for r in rr);br=read(wave/'batch_index.json');pr=read(wave/'production_runs.json');assert len(br)==len(pr)
  for b,r in zip(br,pr):assert b['sha256']==hashlib.sha256((wave/b['file']).read_bytes()).hexdigest() and r['commit']['public_aed']==b['baseline']+b['inserted'] and r['rehearsal']=='passed'
  runs.extend(pr);held+=sum(r['held'] for r in rr)
  for s in read(wave/'sources.json'):
   code=match(s['prefecture'],s['municipality'],master);assert code;new_codes.add(code)
  for r in rr:
   excluded.extend(dict(dataset=r['key'],wave=str(wave),**e) for e in r.get('excluded',[]))
 inserted=sum(r['inserted'] for r in runs);totals=read(P/'production_totals.json')[0];assert sum(counts.values())==totals['public_aed']==41987+inserted-382
 before=read(Path('data/aed_national_resume/municipality_counts_after.json'));added=[c for c in counts if counts[c] and not before.get(c)];lost=[c for c in before if before[c] and not counts[c]]
 fetched=read(P/'candidate_fetch.json');discovery=read(Path('data/aed_dev11_discovery/municipality_candidates.json'));old=read(Path('data/aed_national_resume/municipality_queue.json'));queue=[]
 for m in old:
  d=dict(m);d['public_aed_count']=counts[m['code']];d['new_catalog_candidates']=[x for x in discovery if x.get('code')==m['code']];d['all_facilities_coverage']='unconfirmed';d['updated_at']='2026-09-15'
  if counts[m['code']]:d['status']='published_aed_present';d['priority']=3;d['next_action']='自治体内の未取得情報源・未公開行・更新日を照合。掲載ありは全施設網羅ではない'
  elif d['candidates'] or d['new_catalog_candidates']:d['status']='candidate_processing_required';d['priority']=1;d['next_action']='取得済み原本・資源URLを再利用し、利用条件・形式・位置精度・利用制限の未解決理由を処理'
  else:d['status']='source_discovery_required';d['priority']=2;d['next_action']='県域カタログ・広域消防・自治体公式の情報源を探索。未確認を不存在とみなさない'
  queue.append(d)
 summary=dict(date='2026-09-15',before_public_aed=41987,inserted=inserted,quarantined_existing_low_precision=382,after_public_aed=totals['public_aed'],municipalities=1741,published_municipalities=len(counts),unpublished_municipalities=1741-len(counts),newly_published_municipalities=len(added),municipalities_lost_after_precision_hold=len(lost),lost_codes=lost,new_duplicate_holds=held,staging_holds=totals['stage_holds'],transactions=len(runs),candidate_datasets_checked=len(fetched),files_downloaded=sum(r['fetch_status']=='downloaded' for r in fetched),downloaded_rows=sum(r.get('rows',0) for r in fetched),geocoding_inputs=3722,new_catalog_datasets=len(discovery),queue_states=dict(Counter(r['status'] for r in queue)),legacy_audit=dict(target=1726,local_results=910,confirmed_low_precision_quarantined=382,not_yet_rechecked=816,remaining_result_review=122,matching_level8=406,blocker='Automatic approval review rejected further external geocoding of connector-derived addresses. Do not retry without explicit permission or a genuinely offline alternative.'),coverage_note='掲載ありは1件以上。自治体内の全AED網羅、全国の全情報源確認はいずれも未完了。')
 write(P/'municipality_counts_after.json',counts);write(P/'municipality_queue.json',queue);write(P/'row_exceptions.json',excluded);write(P/'summary.json',summary)
 lines=['# 開発11 AED全国対応（2026-09-15）','',f"公開AED: {totals['public_aed']:,}件。今回{inserted:,}件追加、過去の位置精度不足382件を保留。",f"掲載あり: {len(counts)}/1,741自治体。未掲載: {1741-len(counts)}。",'掲載ありは全施設網羅ではない。','', '| 都道府県 | 自治体数 | 掲載あり | 未掲載 | 公開AED |','|---|---:|---:|---:|---:|']
 for pref in dict.fromkeys(m['prefecture'] for m in master):
  ms=[m for m in master if m['prefecture']==pref];n=sum(bool(counts[m['code']]) for m in ms);lines.append(f"| {pref} | {len(ms)} | {n} | {len(ms)-n} | {sum(counts[m['code']] for m in ms):,} |")
 lines+=['','## 継続作業','','全国管理表: `data/aed_dev11/municipality_queue.json`。取得済み候補と新規カタログ候補を優先し、県数による処理制限を設けない。','旧座標補完1726件の外部再照合は自動承認審査で中断。910件の手元証跡で382件の精度不足を確定し、データを保持して公開停止。未再照合816件・座標差異等122件の確認は残作業。外部送信の再試行には明示承認が必要。','新規ジオコーディングは自治体公開原本を入力し、住所文字列のlevelではなくpoint.level=8を必須化。','出典更新日は現地確認日ではない。古い出典・施設の稼働状況の更新確認も残る。','']
 Path('data/import_reports/20260915_aed_dev11_progress.md').write_text('\n'.join(lines))
 roadmap=Path('ROADMAP.md');text=roadmap.read_text();header='# 開発11 AED全国一括処理（2026-09-15）';intro=f"{header}\n\n{inserted:,}件を追加。旧位置補完の精度不足382件を一時公開停止。全国{totals['public_aed']:,}件、掲載{len(counts)}/1,741自治体、未掲載{1741-len(counts)}。掲載ありは全施設網羅を意味しない。\n\n49候補を一括確認、43ファイル・5,526行取得、住所3,722行の位置精度を確認。4地域カタログ104データセットを取得。全国台帳と未解決理由を再整理。再開入口: `data/aed_dev11/README.md`。外部照合の承認で止まった旧データ監査は同READMEの制約を厳守。\n\n<!-- dev11-end -->\n"
 if text.startswith(header):text=text.split('<!-- dev11-end -->\n',1)[1]
 roadmap.write_text(intro+text);print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
