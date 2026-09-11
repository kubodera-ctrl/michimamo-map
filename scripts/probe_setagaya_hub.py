#!/usr/bin/env python3
import json, re, requests
from pathlib import Path

item_id="dc02f04286954fd9857df355948d1323"
url="https://data-setagaya.opendata.arcgis.com/maps/"+item_id
r=requests.get(url,headers={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"},timeout=60)
html=r.text
contexts=[]
for pat in [item_id,"api/v3","hub.arcgis","FeatureServer","dataset","source","serviceUrl"]:
    for m in re.finditer(re.escape(pat),html,re.I):
        contexts.append({"pattern":pat,"context":html[max(0,m.start()-700):m.end()+1200]})
out={"status":r.status_code,"url":r.url,"contexts":contexts[:100]}
Path("data/import_reports/20260912_setagaya_hub_contexts.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":r.status_code,"contexts":contexts[:20]},ensure_ascii=False)[:40000])
