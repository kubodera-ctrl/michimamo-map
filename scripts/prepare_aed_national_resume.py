"""Prepare reviewed national sources in bounded, separately guarded transactions."""
import json,hashlib,math,re
from pathlib import Path
from collections import Counter
from import_aed_open_data import read_records,first_value
from import_nationwide_aed import clean,mark_duplicates
from prepare_bodik_aed_review import make_row,municipality_from_address
from build_aed_dev10_publication import build
ROOT=Path('data/aed_national_resume')
def main():
 m=json.loads((ROOT/'sources.json').read_text())
 for f,h in m['evidence_hashes'].items():assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h
 baseline=m['production_baseline'];batch_index=[];reports=[]
 for s in m['sources']:
  resource=s['resources'][0];payload=(ROOT/resource['snapshot']).read_bytes();assert hashlib.sha256(payload).hexdigest()==resource['sha256']
  records=read_records(payload);assert len(records)==resource['expected_raw'];rows=[];excluded=[]
  for i,r in enumerate(records):
   name=first_value(r,('名称','施設名','設置事業所名'));address=first_value(r,('所在地_連結表記','所在地_連結標記','所在地_連結表示','住所','所在地'))
   if not address and r.get('所在地_町字') and r.get('所在地_番地以下'):address=s['prefecture']+s['municipality']+clean(r['所在地_町字'])+clean(r['所在地_番地以下'])
   if address and not address.startswith(s['prefecture']):address=s['prefecture']+address
   location=' / '.join(filter(None,[first_value(r,('設置位置','設置場所')),clean(r.get('建物名等(方書)'))]));remarks=' / '.join(clean(r[k]) for k in ['利用可能日時特記事項','備考'] if r.get(k));reason=None
   if not name or not address:reason='missing_name_address'
   elif municipality_from_address(s['prefecture'],address)!=s['municipality']:reason='municipality_mismatch'
   elif clean(r.get('外部利用不可')) not in ('','0','なし','無'):reason='external_use_restricted'
   elif any(w in location+remarks for w in ['車両','消防車','救急車','移動用','貸出','撤去','廃止','閉鎖','利用者のみ','使用不可']):reason='availability_or_mobile_device_requires_review'
   try:lat,lon=float(r['緯度']),float(r['経度'])
   except (ValueError,TypeError,KeyError):reason=reason or 'invalid_coordinates';lat=lon=0
   south,north,west,east=s['review_bounds']
   if not (south<=lat<=north and west<=lon<=east):reason=reason or 'outside_review_bounds'
   if reason:excluded.append(dict(row=i+2,name=name,address=address,reason=reason));continue
   p=dict(name=name,address=address,prefectureName=s['prefecture'],cityName=s['municipality'],placeOfInstallation=location,telephoneNumber=r.get('電話番号'),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=remarks)
   row=make_row(p,[lon,lat],s,hashlib.sha256(resource['url'].encode()).hexdigest()[:16]);assert row and row['municipality']==s['municipality'];row['_source_row']=i+2;rows.append(row)
  conflicts=set()
  for i,a in enumerate(rows):
   for j,b in enumerate(rows[:i]):
    if clean(a['address'])==clean(b['address']) and 111000*math.hypot(a['latitude']-b['latitude'],.82*(a['longitude']-b['longitude']))>300:conflicts.update([i,j])
  for i in conflicts:excluded.append(dict(row=rows[i]['_source_row'],name=rows[i]['name'],address=rows[i]['address'],reason='same_address_coordinate_conflict'))
  rows=[r for i,r in enumerate(rows) if i not in conflicts]
  for r in rows:r.pop('_source_row')
  rows,exact,near=mark_duplicates(rows)
  public_holds={r['source_key'] for r in json.loads((ROOT/'public_duplicate_holds.json').read_text())}
  for r in rows:
   if r['source_key'] in public_holds:r['duplicate_candidate']=True
  report=dict(key=s['key'],prefecture=s['prefecture'],municipality=s['municipality'],raw_rows=len(records),publish_candidates=sum(not r['duplicate_candidate'] for r in rows),held=sum(r['duplicate_candidate'] for r in rows),exact_removed=exact,near_pairs=near,excluded=excluded,excluded_by_reason=dict(Counter(x['reason'] for x in excluded)))
  reports.append(report)
  (ROOT/f"{s['key']}_review.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
  # Maximum 150 rows keeps each database transaction comfortably bounded.
  for number,start in enumerate(range(0,len(rows),150),1):
   batch=rows[start:start+150];source=dict(s,key=s['key']+f'_{number:02d}');file=f"publish_{source['key']}.sql";sql=build(source,batch,baseline)
   (ROOT/file).write_text(sql);n=sum(not r['duplicate_candidate'] for r in batch);batch_index.append(dict(key=source['key'],file=file,prefecture=s['prefecture'],municipality=s['municipality'],inserted=n,held=len(batch)-n,baseline=baseline,sql_sha256=hashlib.sha256(sql.encode()).hexdigest()));baseline+=n
  print(s['key'],report['publish_candidates'],'publish',report['held'],'hold',report['excluded_by_reason'])
 (ROOT/'review_reports.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n');(ROOT/'batch_index.json').write_text(json.dumps(batch_index,ensure_ascii=False,indent=2)+'\n');print('Expected',baseline,'batches',len(batch_index))
if __name__=='__main__':main()
