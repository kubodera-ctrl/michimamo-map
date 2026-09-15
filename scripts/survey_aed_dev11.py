"""Resume all known unpublished-source candidates with bounded concurrent downloads."""
import json,hashlib,urllib.request,concurrent.futures
from pathlib import Path
from import_aed_open_data import read_records
P=Path('data/aed_dev11'); OLD=Path('data/aed_national_resume')
def run(p):
 out=dict(p); url=p.get('resource_url')
 if not url:return dict(out,fetch_status='resource_selection_required')
 try:
  target=P/'raw'/(p['dataset']+'.bin')
  if target.exists(): raw=target.read_bytes()
  else:
   with urllib.request.urlopen(url,timeout=25) as r:raw=r.read()
   target.write_bytes(raw)
  out.update(snapshot=str(target),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),fetch_status='downloaded')
  try:
   rows=read_records(raw);out['rows']=len(rows);out['fields']=list(rows[0]) if rows else [];out['sample']=rows[:2]
  except Exception as e:out['parse_error']=str(e)
 except Exception as e:out.update(fetch_status='download_failed',error=str(e))
 return out
if __name__=='__main__':
 q={r['code'] for r in json.loads((OLD/'municipality_queue.json').read_text()) if r['status']=='candidate_processing_required'}
 ps=[p for p in json.loads((OLD/'candidate_profiles.json').read_text()) if p.get('code') in q]
 result=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for r in pool.map(run,ps):
   result.append(r);(P/'candidate_fetch.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
   print(r['dataset'],r['fetch_status'],r.get('rows'),flush=True)
