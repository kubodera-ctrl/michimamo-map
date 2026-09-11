#!/usr/bin/env python3
import json, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path

base="https://www.city.setagaya.lg.jp/opendata/index.php"
params={"p":"1_1","keyword":"AED","displayedresults":"100"}
h={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
r=requests.get(base,params=params,headers=h,timeout=60)
soup=BeautifulSoup(r.text,"html.parser")
rows=[]
# capture every table row / result block that mentions AED, plus all links inside it
for tr in soup.find_all("tr"):
    txt=" ".join(tr.stripped_strings)
    if "AED" not in txt.upper() and "ＡＥＤ" not in txt: continue
    rows.append({
      "text":txt[:5000],
      "links":[{"text":" ".join(a.stripped_strings)[:500],"href":urljoin(r.url,a["href"])} for a in tr.find_all("a",href=True)]
    })
# Also capture heading/article/list blocks with AED
blocks=[]
for tag in soup.find_all(["li","article","section","div","dl"]):
    txt=" ".join(tag.stripped_strings)
    if ("AED" in txt.upper() or "ＡＥＤ" in txt) and len(txt)<12000:
        links=[{"text":" ".join(a.stripped_strings)[:500],"href":urljoin(r.url,a["href"])} for a in tag.find_all("a",href=True)]
        if links:
            blocks.append({"text":txt[:8000],"links":links[:30]})
# de-dupe exact text
seen=set(); uniq=[]
for x in rows+blocks:
    key=x["text"]
    if key in seen: continue
    seen.add(key); uniq.append(x)
out={"status":r.status_code,"final_url":r.url,"results":uniq[:200]}
Path("data/import_reports/20260912_setagaya_catalog_search.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:80000])
