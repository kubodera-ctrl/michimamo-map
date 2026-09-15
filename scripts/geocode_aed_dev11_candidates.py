"""Prepare address-only candidates; geocoding output is evidence, never publication approval."""
import json,sys,re
from pathlib import Path
from import_aed_open_data import read_records,first_value
from import_nationwide_aed import clean
P=Path('data/aed_dev11');done={s['key'] for d in ['data/aed_dev11','data/aed_dev11_regional'] for s in json.load(open(d+'/sources.json'))};items=[];excluded=[]
for s in json.load(open(P/'candidate_fetch.json')):
 if s['dataset'] in done or not s.get('snapshot'):continue
 records=read_records(Path(s['snapshot']).read_bytes())
 for number,r in enumerate(records,2):
  name=first_value(r,('名称','施設名','施設名称','NAME1','name','設置箇所'));address=first_value(r,('所在地_連結表記','所在地_連結標記','住所','ADDRESS','address'));city=s['municipality'];pref=s['prefecture']
  if not name or not address:excluded.append(dict(dataset=s['dataset'],row=number,reason='missing_name_or_address'));continue
  if not address.startswith(pref):
   if address.startswith(city) or re.match(r'.+?市|.+?郡',address):address=pref+address
   else:address=pref+city+address
  items.append(dict(dataset=s['dataset'],row=number,name=name,address=address,prefecture=pref,municipality=city,original=r))
(P/'geocode_inputs.json').write_text(json.dumps(items,ensure_ascii=False,indent=2,default=str)+'\n');(P/'geocode_input_exclusions.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2)+'\n');print(len(items),'candidates',len(excluded),'missing address/name')
