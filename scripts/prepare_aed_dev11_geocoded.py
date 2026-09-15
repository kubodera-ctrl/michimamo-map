"""Review national address-only AED candidates using coordinate level 8 evidence."""
import json,hashlib,re
from pathlib import Path
from collections import Counter,defaultdict
from import_aed_open_data import first_value,sql_text
from import_nationwide_aed import clean,mark_duplicates
from prepare_bodik_aed_review import make_row,municipality_from_address
from build_aed_dev10_publication import build
RAW=Path('data/aed_dev11');P=Path('data/aed_dev11_geocoded')
def main():
 P.mkdir(exist_ok=True);profiles={r['dataset']:r for r in json.load(open(RAW/'candidate_fetch.json'))};geo={(r['dataset'],r['row']):r for r in map(json.loads,open(RAW/'geocode_results.ndjson'))};group=defaultdict(list)
 for r in json.load(open(RAW/'geocode_inputs.json')):group[r['dataset']].append(r)
 holds=set(json.load(open(P/'duplicate_holds.json'))) if (P/'duplicate_holds.json').exists() else set();reports=[];sources=[];batches=[];baseline=json.load(open(P/'baseline.json'))['public_aed']
 for key,items in group.items():
  p=profiles[key];reason=None;license_id=None
  assert hashlib.sha256(Path(p['snapshot']).read_bytes()).hexdigest()==p['sha256']
  if key=='okayama_781':reason='aed_resource_selection_required'
  elif key.startswith('okayama_'):
   evidence=' '.join((RAW/(key+'_resource.txt')).read_text().split());license_id='PDL 1.0' if 'ライセンス PDL1.0（公共データ利用規約第1.0版）' in evidence else None;date=re.search(r'最終更新日 (\d+)年(\d+)月(\d+)日',evidence);updated='%04d-%02d-%02d'%tuple(map(int,date.groups())) if date else None
  else:
   f=RAW/(key+'_metadata.json')
   if not f.exists():reason='live_license_metadata_required'
   else:
    m=json.load(open(f))['result'];license_id='CC BY 4.0' if m['license_id']=='cc-by-40-intl' else None;resource=next((r for r in m['resources'] if r['url']==p['resource_url']),None);updated=(resource.get('last_modified') or '')[:10] or None if resource else None
    if not resource:reason='resource_changed'
  if not license_id:reason=reason or 'license_review_required'
  if reason:reports.append(dict(key=key,reason=reason,input_rows=len(items),publish=0,held=0));continue
  s=dict(key=key,prefecture=p['prefecture'],municipality=p['municipality'],source_url=p['source_url'],source_name=p['municipality']+' AED設置情報（まちまもMAPが住所から位置補完）',license_id=license_id,source_date=None,source_updated_at=updated,resource_url=p['resource_url'],sha256=p['sha256'])
  rows=[];excluded=[]
  for item in items:
   r=item['original'];g=geo[(key,item['row'])];assert g['input']==item['address'];point=g.get('point')or{};reason=None;pref=s['prefecture'];city=s['municipality'];name=item['name'];address=item['address']
   location=first_value(r,('設置位置','設置場所','具体的な設置場所','NAME2'));remarks=' / '.join(clean(r.get(k)) for k in ['利用可能日時特記事項','利用可能時間','使用可能時間','備考','利用可能曜日特記事項_1','利用可能曜日特記事項_2'] if clean(r.get(k)))
   gc=clean(g.get('city'))
   if point.get('level')!=8 or point.get('lat') is None or point.get('lng') is None:reason='not_address_coordinate_level_8'
   elif g.get('pref')!=pref or not (gc==city or gc.startswith(city) or ('郡' in gc and gc.endswith(city))):reason='geocode_administrative_mismatch'
   elif municipality_from_address(pref,address)!=city:reason='address_administrative_mismatch'
   elif clean(r.get('外部利用不可')) not in ('','0','なし','無'):reason='external_use_restricted'
   elif any(w in name+location+remarks for w in ['車両','消防車','救急車','移動用','貸出','撤去','廃止','閉鎖','利用者のみ','使用不可']):reason='availability_requires_review'
   if reason:excluded.append(dict(row=item['row'],name=name,address=address,reason=reason));continue
   obj=dict(name=name,address=address,prefectureName=pref,cityName=city,placeOfInstallation=location,telephoneNumber=first_value(r,('電話番号','電話','TEL')),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=remarks)
   row=make_row(obj,[point['lng'],point['lat']],s,'geocoded20260915:'+hashlib.sha256(p['resource_url'].encode()).hexdigest()[:16]);assert row and row['municipality']==city
   row['geocode_source']='Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）';rows.append(row)
  rows,exact,near=mark_duplicates(rows)
  for r in rows:
   if r['source_key'] in holds:r['duplicate_candidate']=True
  report=dict(key=key,prefecture=s['prefecture'],municipality=s['municipality'],input_rows=len(items),eligible=len(rows),publish=sum(not r['duplicate_candidate'] for r in rows),held=sum(r['duplicate_candidate'] for r in rows),exact_removed=exact,excluded=excluded);reports.append(report)
  (P/(key+'_review.json')).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
  if not rows:continue
  # Coordinates independently validated against the geocoder's municipality and point-level evidence.
  s['review_bounds']=[min(r['latitude'] for r in rows)-.0001,max(r['latitude'] for r in rows)+.0001,min(r['longitude'] for r in rows)-.0001,max(r['longitude'] for r in rows)+.0001];sources.append(s)
  for i,start in enumerate(range(0,len(rows),150),1):
   b=rows[start:start+150];source=dict(s,key=key+'_'+str(i));sql=build(source,b,baseline).replace("source_license is distinct from 'CC BY 4.0'",'source_license is distinct from '+sql_text(s['license_id']));n=sum(not r['duplicate_candidate'] for r in b);file='publish_'+source['key']+'.sql';(P/file).write_text(sql);batches.append(dict(key=source['key'],file=file,baseline=baseline,inserted=n,held=len(b)-n,sha256=hashlib.sha256(sql.encode()).hexdigest()));baseline+=n
  print(key,report['publish'],report['held'])
 for file,obj in [('sources.json',sources),('review_reports.json',reports),('batch_index.json',batches)]:(P/file).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
 print('Expected',baseline,'batches',len(batches))
if __name__=='__main__':main()
