#!/usr/bin/env python3
import requests, urllib.parse, re, json
from bs4 import BeautifulSoup
from pathlib import Path

queries=[
 'site:city.setagaya.lg.jp/documents/3038/aedkunaizeniki.pdf "64" AED',
 'site:city.setagaya.lg.jp/documents/3038/aedkunaizeniki.pdf "100" AED',
 'site:city.setagaya.lg.jp/documents/3038/aedkunaizeniki.pdf "200" AED',
]
out=[]
h={"User-Agent":"Mozilla/5.0"}
for q in queries:
    url="https://html.duckduckgo.com/html/?"+urllib.parse.urlencode({"q":q})
    r=requests.get(url,headers=h,timeout=30)
    soup=BeautifulSoup(r.text,"html.parser")
    rows=[]
    for res in soup.select(".result"):
        rows.append({
            "title":" ".join(res.select_one(".result__title").stripped_strings) if res.select_one(".result__title") else "",
            "snippet":" ".join(res.select_one(".result__snippet").stripped_strings) if res.select_one(".result__snippet") else "",
            "href":res.select_one(".result__a").get("href") if res.select_one(".result__a") else ""
        })
    out.append({"q":q,"status":r.status_code,"rows":rows[:5],"html_head":r.text[:1000]})
Path("data/import_reports/20260912_ddg_setagaya_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:30000])
