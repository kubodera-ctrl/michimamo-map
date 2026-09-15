"""Verify published wave counts through the same anonymous RPC as the map."""
import json,re,urllib.request,concurrent.futures
from pathlib import Path
app=Path('index.html').read_text();url=re.search(r"const SUPABASE_URL = '([^']+)'",app)[1];key=re.search(r"const SUPABASE_KEY = '([^']+)'",app)[1]
def check(item):
 directory,source,expected=item;b=source['review_bounds'];body=json.dumps(dict(p_west=b[2],p_south=b[0],p_east=b[3],p_north=b[1],p_types=['aed'],p_max_rows=1500)).encode();req=urllib.request.Request(url+'/rest/v1/rpc/get_safety_spots',data=body,headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as r:rows=json.load(r)
 matches=[r for r in rows if r['source_url']==source['source_url']];assert len(rows)<1500,'RPC truncated';assert len(matches)==expected,(source['key'],len(matches),expected)
 assert all(r['source_license']==source['license_id'] and r['municipality']==source['municipality'] for r in matches)
 return dict(directory=directory,key=source['key'],count=len(matches),expected=expected,license=source['license_id'],status='passed')
items=[]
for d in ['data/aed_dev11','data/aed_dev11_regional','data/aed_dev11_geocoded']:
 reports={r['key']:r for r in json.load(open(d+'/review_reports.json'))}
 for s in json.load(open(d+'/sources.json')):items.append((d,s,reports[s['key']]['publish']))
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:results=list(pool.map(check,items))
Path('data/aed_dev11/anon_rpc_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps(results,ensure_ascii=False))
