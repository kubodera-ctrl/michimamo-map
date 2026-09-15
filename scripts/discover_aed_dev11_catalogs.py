"""Discover regional catalogue pages with explicit scope, pagination and source evidence."""
import json,re,html,hashlib,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
P=Path('data/aed_dev11_discovery');P.mkdir(exist_ok=True)
SEEDS=[('埼玉県','https://opendata.pref.saitama.lg.jp/datasets?keyword=AED'),('千葉県','https://opendata.pref.chiba.lg.jp/datasets?keyword=aed'),('宮城県','https://miyagi.dataeye.jp/datasets?keyword=AED'),('岡山県','https://www.okayama-opendata.jp/datasets?keyword=AED')]
def fetch(url):
 with urllib.request.urlopen(url,timeout=20) as r:b=r.read()
 return b.decode('utf-8','replace')
def links(s,url):return [urllib.parse.urljoin(url,html.unescape(x)) for x in re.findall(r'href=[\"\']([^\"\']+)',s)]
def text(s):return ' '.join(html.unescape(re.sub('<[^>]+>',' ',re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',s,flags=re.S))).split())
def survey(seed):
 pref,url=seed;pending=[url];seen=set();datasets=set();errors=[]
 while pending and len(seen)<30:
  u=pending.pop(0)
  if u in seen:continue
  seen.add(u)
  try:
   s=fetch(u);ls=links(s,u);datasets.update(x for x in ls if re.search('/datasets/[^/?#]+$',x));pending.extend(x for x in ls if 'page=' in x and '/datasets?' in x and urllib.parse.urlparse(x).netloc==urllib.parse.urlparse(url).netloc and x not in seen)
  except Exception as e:errors.append(dict(url=u,error=str(e)))
 return dict(prefecture=pref,seed=url,list_pages=sorted(seen),dataset_urls=sorted(datasets),errors=errors,scope='catalogue search only; no assertion that every municipal source was checked')
def profile(item):
 pref,url=item
 try:
  s=fetch(url);t=text(s);title=html.unescape(re.search(r'<title[^>]*>(.*?)</title>',s,re.S)[1]);resources=sorted(set(x for x in links(s,url) if '/resources/' in x));(P/(hashlib.sha256(url.encode()).hexdigest()[:16]+'.txt')).write_text(t+'\n')
  return dict(prefecture=pref,url=url,title=title,resource_pages=resources,sha256=hashlib.sha256(s.encode()).hexdigest())
 except Exception as e:return dict(prefecture=pref,url=url,error=str(e))
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:scope=list(pool.map(survey,SEEDS))
 (P/'scope.json').write_text(json.dumps(scope,ensure_ascii=False,indent=2)+'\n')
 items=[(x['prefecture'],url) for x in scope for url in x['dataset_urls']]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  results=[]
  for r in pool.map(profile,items):
   results.append(r);(P/'datasets.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(r['prefecture'],r.get('title',r.get('error')),flush=True)
