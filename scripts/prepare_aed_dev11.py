"""Prepare the national candidate wave, preserving original metadata and row exclusions."""
import json,hashlib,math,re
from pathlib import Path
from collections import Counter
from import_aed_open_data import read_records,first_value
from import_nationwide_aed import clean,mark_duplicates
from prepare_bodik_aed_review import make_row,municipality_from_address
from build_aed_dev10_publication import build
P=Path('data/aed_dev11')
SPECS={
 '46201_aed-minkan':[31.25,31.8,130.35,130.8],
 '462012_aed-shi':[31.25,31.8,130.35,130.8],
 '462012_aed-kuniken':[31.25,31.8,130.35,130.8],
 '462209_aed':[31.2,31.6,130.1,130.5],
 '432156_amakusa002':[32.1,32.65,129.9,130.5],
 '402125_0009100_00011':[33.15,33.27,130.3,130.45]}
def main():
 profiles={r['dataset']:r for r in json.loads((P/'candidate_fetch.json').read_text())}; baseline=41987;allrows=[];reports=[];sources=[]
 holds=set(json.loads((P/'duplicate_holds.json').read_text())) if (P/'duplicate_holds.json').exists() else set()
 for key,bounds in SPECS.items():
  p=profiles[key];meta=json.loads((P/(key+'_metadata.json')).read_text())['result'];assert meta['license_id']=='cc-by-40-intl'
  res=next(r for r in meta['resources'] if r['url']==p['resource_url'])
  s=dict(key=key,prefecture=p['prefecture'],municipality=p['municipality'],source_url=p['source_url'],source_name=p['municipality']+' AED設置情報（まちまもMAPが表記整形・位置検証）',license_id='CC BY 4.0',source_updated_at=(res.get('last_modified') or '')[:10] or None,source_date=None,review_bounds=bounds,resource_url=p['resource_url'],sha256=p['sha256'])
  payload=Path(p['snapshot']).read_bytes();assert hashlib.sha256(payload).hexdigest()==p['sha256'];records=read_records(payload);rows=[];excluded=[];swapped=0
  for idx,r in enumerate(records,2):
   name=first_value(r,('名称','設置箇所'));address=first_value(r,('所在地_連結表記','所在地_連結標記','住所','所在地'));city=s['municipality'];pref=s['prefecture']
   if address and not address.startswith(pref):
    # Only prefix municipality when the dataset's explicit municipal code identifies it.
    if address.startswith(city):address=pref+address
    elif key in ('46201_aed-minkan','462012_aed-shi','462012_aed-kuniken') and not re.match(r'.+?市|.+?郡',address):address=pref+city+address
    elif key=='282197_aed' and str(r.get('都道府県コード又は市区町村コード'))=='282197':address=pref+city+address
    else:address=pref+address
   location=first_value(r,('設置位置','設置場所'));remarks=' / '.join(clean(r.get(k)) for k in ['利用可能日時特記事項','備考'] if clean(r.get(k)));reason=None
   if not name or not address:reason='missing_name_address'
   elif municipality_from_address(pref,address)!=city:reason='municipality_mismatch'
   elif clean(r.get('外部利用不可')) not in ('','0','なし','無'):reason='external_use_restricted'
   elif any(w in name+location+remarks for w in ['車両','消防車','救急車','移動用','貸出','撤去','廃止','閉鎖','利用者のみ','使用不可']):reason='availability_requires_review'
   try:
    lat=float(r.get('緯度（世界）',r.get('緯度')));lon=float(r.get('経度（世界）',r.get('経度')))
    if 122<=lat<=154 and 20<=lon<=46:lat,lon=lon,lat;swapped+=1
   except (TypeError,ValueError):lat=lon=0;reason=reason or 'missing_invalid_coordinates'
   if not(bounds[0]<=lat<=bounds[1] and bounds[2]<=lon<=bounds[3]):reason=reason or 'outside_review_bounds'
   if reason:excluded.append(dict(row=idx,name=name,address=address,reason=reason));continue
   obj=dict(name=name,address=address,prefectureName=pref,cityName=city,placeOfInstallation=location,telephoneNumber=r.get('電話番号'),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=remarks)
   row=make_row(obj,[lon,lat],s,hashlib.sha256(p['resource_url'].encode()).hexdigest()[:16]);assert row and row['municipality']==city
   rows.append(row)
  # Keep conflicting positions at the same normalized address for manual review.
  conflicts=set()
  for i,a in enumerate(rows):
   for j,b in enumerate(rows[:i]):
    if clean(a['address'])==clean(b['address']) and 111000*math.hypot(a['latitude']-b['latitude'],.82*(a['longitude']-b['longitude']))>300:conflicts.update([i,j])
  for i in conflicts:excluded.append(dict(name=rows[i]['name'],address=rows[i]['address'],reason='same_address_coordinate_conflict'))
  rows=[r for i,r in enumerate(rows) if i not in conflicts];rows,exact,near=mark_duplicates(rows)
  for r in rows:
   if r['source_key'] in holds:r['duplicate_candidate']=True
  reports.append(dict(key=key,municipality=city,raw_rows=len(records),eligible=len(rows),publish=sum(not r['duplicate_candidate'] for r in rows),held=sum(r['duplicate_candidate'] for r in rows),swapped_coordinates=swapped,exact_removed=exact,excluded=excluded))
  (P/(key+'_review.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');sources.append(s);allrows.extend(rows)
 (P/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n');(P/'review_reports.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
 batches=[]
 for s in sources:
  rows=json.loads((P/(s['key']+'_review.json')).read_text())
  for i,start in enumerate(range(0,len(rows),150),1):
   b=rows[start:start+150];source=dict(s,key=s['key']+'_'+str(i));sql=build(source,b,baseline);n=sum(not r['duplicate_candidate'] for r in b);filename='publish_'+source['key']+'.sql';(P/filename).write_text(sql)
   batches.append(dict(key=source['key'],file=filename,baseline=baseline,inserted=n,held=len(b)-n,sha256=hashlib.sha256(sql.encode()).hexdigest()));baseline+=n
 (P/'batch_index.json').write_text(json.dumps(batches,indent=2)+'\n')
 for r in reports:print(r['key'],r['publish'],r['held'],dict(Counter(x['reason'] for x in r['excluded'])))
 print('Expected',baseline,'batches',len(batches))
if __name__=='__main__':main()
