"""Discover licensed municipal AED CSV links from Kochi's official municipality index."""
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import re
import urllib.request
from urllib.parse import urljoin
from import_aed_open_data import LinkCollector
from import_nationwide_aed import clean, has_denied_provenance

def html(url):
    with urllib.request.urlopen(url,timeout=25) as r:return r.read().decode('utf-8')

def scan(item):
    url,city=item
    page=html(url);sources=[]
    for fragment in re.findall(r'<tr\b.*?</tr>',page,re.S|re.I)+[page]:
        parser=LinkCollector();parser.feed(fragment)
        licensed='creativecommons.org/licenses/by/4.0' in fragment
        if not licensed or re.search(r'creativecommons.org/licenses/by-(?:nc|nd|sa)',fragment):continue
        is_aed_row=fragment!=page and 'aed' in clean(re.sub('<[^>]*>',' ',fragment)).lower()
        for href,title in parser.links:
            if not ('.csv' in href.lower() or 'csv' in title.lower()):continue
            if not (is_aed_row or 'aed' in clean(href+' '+title).lower()):continue
            resource=urljoin(url,href)
            if has_denied_provenance({'url':url,'title':title},{}):continue
            sources.append(dict(prefecture='高知県',municipality=city,source_name=city+' AED設置箇所一覧',source_url=url,resource_url=resource,license_id='CC-BY-4.0',source_updated_at=None))
    return list({s['resource_url']:s for s in sources}.values())

if __name__=='__main__':
    index='https://www.pref.kochi.lg.jp/opendata/'
    parser=LinkCollector();parser.feed(html(index));cities=[(urljoin(index,u),t) for u,t in parser.links if t.endswith(('市','町','村'))]
    sources=[];report=[]
    with ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(scan,c):c for c in cities}
        for j in as_completed(jobs):
            try:
                result=j.result();sources.extend(result);report.append({'municipality':jobs[j][1],'sources':len(result)});print(jobs[j][1],len(result),flush=True)
            except Exception as e:report.append({'municipality':jobs[j][1],'error':str(e)});print(jobs[j][1],str(e),flush=True)
    Path('/tmp/aed_gap_review/kochi_discovery.json').write_text(json.dumps({'sources':sources,'report':report},ensure_ascii=False,indent=2))
