"""Collect official regional AED sources and cache downloads for review, never publish."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import urllib.request
from import_nationwide_aed import clean, has_denied_provenance

CATALOGS=[('石川県','https://ckan.opendata.pref.ishikawa.lg.jp'),('山口県','https://yamaguchi-opendata.jp/ckan'),('岐阜県','https://gifu-opendata.pref.gifu.lg.jp')]
ALLOWED={'cc-by','cc-by-40-intl','cc-by-4.0','cc-by-2.0','cc-by-2.1','cc-zero'}

def collect(pref,base):
    with urllib.request.urlopen(base+'/api/3/action/package_search?q=AED&rows=100',timeout=30) as r: data=json.load(r)['result']
    if data['count']>len(data['results']): raise ValueError('Catalog pagination required')
    sources=[];excluded=[]
    for p in data['results']:
        if 'aed' not in clean(p['title']).lower():continue
        if (p.get('license_id') or '').lower() not in ALLOWED or has_denied_provenance(p,{}):
            excluded.append({'title':p['title'],'reason':'license_or_provenance','license':p.get('license_id')});continue
        resources=[r for r in p['resources'] if r.get('format','').upper()=='CSV' and not has_denied_provenance(p,r)]
        if not resources:
            excluded.append({'title':p['title'],'reason':'no_csv'});continue
        r=max(resources,key=lambda r:(r.get('last_modified') or r.get('created') or '',r.get('position',0)))
        sources.append({'prefecture':pref,'municipality':'','source_name':p.get('organization',{}).get('title','')+' '+p['title'],'source_url':base+'/dataset/'+p['id'],'resource_url':r['url'],'license_id':p['license_id'],'source_updated_at':r.get('last_modified'),'allowed':True})
    return sources,excluded

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--output-dir',type=Path,required=True);ap.add_argument('--manual',type=Path,required=True);args=ap.parse_args();args.output_dir.mkdir(exist_ok=True,parents=True)
    sources=json.loads(args.manual.read_text())['sources'];excluded=[]
    with ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(collect,*c):c for c in CATALOGS}
        for job in as_completed(jobs):
            try:
                ss,ee=job.result();sources.extend(ss);excluded.extend(ee);print(jobs[job][0],len(ss),'sources',flush=True)
            except Exception as e:excluded.append({'catalog':jobs[job],'error':str(e)})
    (args.output_dir/'supplement.json').write_text(json.dumps({'sources':sources,'excluded':excluded},ensure_ascii=False,indent=2))
    (args.output_dir/'features.json').write_text('[]');(args.output_dir/'sources.json').write_text('{}')
    def download(s):
        url=s['resource_url'];cache=args.output_dir/(hashlib.sha256(url.encode()).hexdigest()+'.bin')
        if not cache.exists():
            with urllib.request.urlopen(url,timeout=30) as r:cache.write_bytes(r.read())
        return len(cache.read_bytes())
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(download,s):s for s in sources}
        for job in as_completed(jobs):
            try: print(jobs[job]['source_name'],job.result(),flush=True)
            except Exception as e: print('download_error',jobs[job]['resource_url'],str(e),flush=True)
