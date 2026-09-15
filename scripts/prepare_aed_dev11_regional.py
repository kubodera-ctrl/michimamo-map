"""Prepare re-fetched regional AED resources using explicit column and license mappings."""
import json,hashlib,math,re
from pathlib import Path
from collections import Counter
from import_aed_open_data import read_records,first_value,sql_text
from import_nationwide_aed import clean,mark_duplicates
from prepare_bodik_aed_review import make_row,municipality_from_address
from build_aed_dev10_publication import build
RAW=Path('data/aed_dev11');P=Path('data/aed_dev11_regional')
SPECS={
 'okayama_652':[34.56,34.71,133.49,133.69],
 'okayama_640':[34.27,34.64,133.4,133.63],
 'okayama_190':[34.96,35.32,133.82,134.25],
 'okayama_1084':[35.05,35.19,134.08,134.25],
 'okayama_1019':[34.85,35.02,133.84,134.04],
 'okayama_651':[34.58,34.64,133.78,133.86],
 'okayama_646':[34.47,34.64,133.55,133.68],
 'okayama_471':[35.02,35.34,133.66,134.02],
 'okayama_653':[34.48,34.55,133.53,133.59]}
def main():
 P.mkdir(exist_ok=True);profiles={r['dataset']:r for r in json.loads((RAW/'candidate_fetch.json').read_text())};baseline=43059;sources=[];reports=[];batches=[]
 holds=set(json.loads((P/'duplicate_holds.json').read_text())) if (P/'duplicate_holds.json').exists() else set()
 for key,bounds in SPECS.items():
  p=profiles[key];evidence=' '.join((RAW/(key+'_resource.txt')).read_text().split());assert 'ライセンス PDL1.0（公共データ利用規約第1.0版）' in evidence
  date=re.search(r'最終更新日 (\d+)年(\d+)月(\d+)日',evidence);assert date
  s=dict(key=key,prefecture=p['prefecture'],municipality=p['municipality'],source_url=p['source_url'],source_name=p['municipality']+' AED設置情報（まちまもMAPが表記整形・位置検証）',license_id='PDL 1.0',source_updated_at='%04d-%02d-%02d'%tuple(map(int,date.groups())),source_date=None,review_bounds=bounds,resource_url=p['resource_url'],sha256=p['sha256'],resource_metadata_url='https://www.okayama-opendata.jp/resources/'+p['resource_url'].rsplit('/',1)[-1])
  payload=Path(p['snapshot']).read_bytes();assert hashlib.sha256(payload).hexdigest()==p['sha256'];records=read_records(payload);rows=[];excluded=[]
  for idx,r in enumerate(records,2):
   name=first_value(r,('名称','施設名','name','AED設置施設名称'));address=first_value(r,('所在地_連結表記','住所','address','AED設置施設住所'));pref=s['prefecture'];city=s['municipality']
   if key=='okayama_471' and address and not address.startswith(pref) and not re.match(r'.+?市|.+?郡',address):address=pref+city+address
   elif address and not address.startswith(pref):address=pref+address
   location=first_value(r,('設置位置','設置場所','設置個所'));remarks=' / '.join(clean(r.get(k)) for k in ['利用可能日時特記事項','備考','情報2','情報3'] if clean(r.get(k)));reason=None
   if not name or not address:reason='missing_name_address'
   elif municipality_from_address(pref,address)!=city:reason='municipality_mismatch'
   elif key=='okayama_1084' and (r.get('大分類__')!='AED設置個所' or r.get('公開範囲')!='庁外公開'):reason='not_public_aed'
   elif clean(r.get('外部利用不可')) not in ('','0','なし','無'):reason='external_use_restricted'
   elif any(w in name+location+remarks for w in ['車両','消防車','救急車','移動用','貸出','撤去','廃止','閉鎖','利用者のみ','使用不可']):reason='availability_requires_review'
   try:lat=float(first_value(r,('緯度','AED設置施設緯度','世界_10進_Y','Y')));lon=float(first_value(r,('経度','AED設置施設経度','世界_10進_X','X')))
   except (ValueError,TypeError):lat=lon=0;reason=reason or 'missing_invalid_coordinates'
   if not(bounds[0]<=lat<=bounds[1] and bounds[2]<=lon<=bounds[3]):reason=reason or 'outside_review_bounds'
   if reason:excluded.append(dict(row=idx,name=name,address=address,reason=reason));continue
   obj=dict(name=name,address=address,prefectureName=pref,cityName=city,placeOfInstallation=location,telephoneNumber=first_value(r,('電話番号','電話','TEL','AED設置施設電話番号')),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=remarks)
   row=make_row(obj,[lon,lat],s,hashlib.sha256(p['resource_url'].encode()).hexdigest()[:16]);assert row and row['municipality']==city;rows.append(row)
  conflicts=set()
  for i,a in enumerate(rows):
   for j,b in enumerate(rows[:i]):
    if clean(a['address'])==clean(b['address']) and 111000*math.hypot(a['latitude']-b['latitude'],.82*(a['longitude']-b['longitude']))>300:conflicts.update([i,j])
  for i in conflicts:excluded.append(dict(name=rows[i]['name'],address=rows[i]['address'],reason='same_address_coordinate_conflict'))
  rows=[r for i,r in enumerate(rows) if i not in conflicts];rows,exact,near=mark_duplicates(rows)
  for r in rows:
   if r['source_key'] in holds:r['duplicate_candidate']=True
  report=dict(key=key,municipality=city,raw_rows=len(records),eligible=len(rows),publish=sum(not r['duplicate_candidate'] for r in rows),held=sum(r['duplicate_candidate'] for r in rows),exact_removed=exact,excluded=excluded);reports.append(report);sources.append(s)
  (P/(key+'_review.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
  for i,start in enumerate(range(0,len(rows),150),1):
   b=rows[start:start+150];source=dict(s,key=key+'_'+str(i));sql=build(source,b,baseline).replace("source_license is distinct from 'CC BY 4.0'",'source_license is distinct from '+sql_text(s['license_id']));n=sum(not r['duplicate_candidate'] for r in b);filename='publish_'+source['key']+'.sql';(P/filename).write_text(sql);batches.append(dict(key=source['key'],file=filename,baseline=baseline,inserted=n,held=len(b)-n,sha256=hashlib.sha256(sql.encode()).hexdigest()));baseline+=n
  print(key,report['publish'],report['held'],dict(Counter(x['reason'] for x in excluded)))
 for file,obj in [('sources.json',sources),('review_reports.json',reports),('batch_index.json',batches)]:(P/file).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
 print('Expected',baseline,'batches',len(batches))
if __name__=='__main__':main()
