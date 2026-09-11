#!/usr/bin/env python3
import json, re, requests, urllib.parse
from pathlib import Path

url="https://data-setagaya.opendata.arcgis.com/maps/dc02f04286954fd9857df355948d1323"
r=requests.get(url,headers={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"},timeout=60)
html=r.text
decoded=urllib.parse.unquote(html)
contexts=[]
for text,name in [(html,"raw"),(decoded,"decoded")]:
    for pat in ["AED","dc02f04286954fd9857df355948d1323","FeatureServer","GeoJSON","downloads","api/v3"]:
        for m in re.finditer(re.escape(pat),text,re.I):
            contexts.append({"source":name,"pattern":pat,"context":text[max(0,m.start()-1200):m.end()+2200]})
out={"status":r.status_code,"url":r.url,"contexts":contexts[:200]}
Path("data/import_reports/20260912_setagaya_hub_contexts.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":r.status_code,"contexts":contexts[:50]},ensure_ascii=False)[:60000])
