#!/usr/bin/env python3
"""Fetch AED geometry and resolve the original CKAN resource's license.

Produces a private review JSON, never writes to the production database.
Cached downloads make interrupted runs resumable.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import time
import threading
import urllib.parse
import urllib.request

API = 'https://wapi.bodik.jp'
ODM = 'https://odm.bodik.jp/api/3/action/'
ALLOWED = {'cc-by', 'cc-by-40-intl', 'cc-by-21-jp', 'cc-zero'}


def fetch(url, cache):
    path = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    if path.exists():
        return json.loads(path.read_text())
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'machimamo-aed-import/1.0'})
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.load(response)
            if isinstance(data, dict) and data.get('success') is False:
                raise ValueError('API returned success=false')
            temporary = path.with_suffix(f'.{threading.get_ident()}.tmp')
            temporary.write_text(json.dumps(data, ensure_ascii=False))
            temporary.replace(path)
            return data
        except Exception as error:
            if attempt == 2:
                raise
            print(f'retry {attempt+1}: {url}: {error}', flush=True)
            time.sleep(attempt+1)


def resolve(resource_id, cache):
    resource = fetch(ODM+'resource_show?'+urllib.parse.urlencode({'id':resource_id}), cache)['result']
    package = fetch(ODM+'package_show?'+urllib.parse.urlencode({'id':resource['package_id']}), cache)['result']
    return {'resource_id': resource_id, 'resource_url':resource['url'],
            'source_url':'https://odm.bodik.jp/dataset/'+package['id'],
            'source_name':package['title'], 'license_id':package.get('license_id'),
            'license_url':package.get('license_url'),
            'source_updated_at':resource.get('updatedat') or resource.get('last_modified'),
            'allowed':package.get('license_id') in ALLOWED,
            'notes':package.get('notes')}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=4)
    args=parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    cache=args.output_dir/'cache'
    cache.mkdir(exist_ok=True)
    organizations=fetch(API+'/aed/organization',cache)
    features=[]
    failures=[]
    def get_city(org):
        code=org['organ_code']
        url=API+'/aed?'+urllib.parse.urlencode({'select_type':'geometry','maxResults':max(org['count']+100,1000),'resource_organ_code':code})
        data=fetch(url,cache)
        rows=data['resultsets']['features']
        if len(rows)!=data['metadata']['totalCount']:
            raise ValueError(f'truncated {code}: {len(rows)}/{data["metadata"]["totalCount"]}')
        return rows
    with ThreadPoolExecutor(max_workers=max(1,min(args.workers,6))) as pool:
        tasks={pool.submit(get_city,org):org for org in organizations}
        for i,future in enumerate(as_completed(tasks),1):
            org=tasks[future]
            try:
                features.extend(future.result())
            except Exception as error:
                failures.append({'organization':org,'error':str(error)})
            print(f'cities {i}/{len(organizations)} rows={len(features)} errors={len(failures)}',flush=True)
    (args.output_dir/'features.json').write_text(json.dumps(features,ensure_ascii=False))
    resource_ids=sorted({f['properties']['resource_id'] for f in features})
    sources={}
    with ThreadPoolExecutor(max_workers=max(1,min(args.workers,6))) as pool:
        tasks={pool.submit(resolve,rid,cache):rid for rid in resource_ids}
        for i,future in enumerate(as_completed(tasks),1):
            resource_id=tasks[future]
            try:
                sources[resource_id]=future.result()
            except Exception as error:
                sources[resource_id]={'allowed':False,'error':str(error)}
            (args.output_dir/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
            print(f'sources {i}/{len(resource_ids)}',flush=True)
    (args.output_dir/'report.json').write_text(json.dumps({'organizations':len(organizations),'fetched_rows':len(features),'failures':failures,'resources':len(sources),'allowed_resources':sum(s.get('allowed',False) for s in sources.values())},ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
