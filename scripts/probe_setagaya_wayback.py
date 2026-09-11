#!/usr/bin/env python3
import requests, re, json
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path

base="https://www.city.setagaya.lg.jp/opendata/index.php"
h={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
r=requests.get(base,headers=h,timeout=30)
soup=BeautifulSoup(r.text,"html.parser")
forms=[]
for form in soup.find_all("form"):
    forms.append({
      "action":urljoin(r.url,form.get("action") or ""),
      "method":form.get("method"),
      "inputs":[{"name":x.get("name"),"value":x.get("value"),"type":x.get("type")} for x in form.find_all(["input","select","textarea"])],
      "text":" ".join(form.stripped_strings)[:2000]
    })
scripts=[urljoin(r.url,s.get("src")) for s in soup.find_all("script",src=True)]
links=[{"text":" ".join(a.stripped_strings),"href":urljoin(r.url,a.get("href"))} for a in soup.find_all("a",href=True) if "opendata" in (a.get("href") or "")]
out={"status":r.status_code,"final":r.url,"forms":forms,"scripts":scripts,"opendata_links":links[:300],"html_head":r.text[:10000]}
Path("data/import_reports/20260912_setagaya_catalog_form.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"forms":forms,"scripts":scripts,"links":links[:50]},ensure_ascii=False)[:50000])
