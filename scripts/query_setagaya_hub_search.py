#!/usr/bin/env python3
import json, requests
from pathlib import Path

base="https://hub.arcgis.com/api/search/v1/collections/all/items"
all_items=[]
pages=[]
start=1
while True:
    params={"filter":"((owner IN (setajosei)))","limit":100,"startindex":start}
    r=requests.get(base,params=params,timeout=60,headers={"User-Agent":"machimamo-map/1.0"})
    d=r.json()
    feats=d.get("features",[])
    items=[]
    for x in feats:
        p=x.get("properties") or {}
        item={
          "id":x.get("id"),"title":p.get("name") or p.get("title"),
          "type":p.get("type"),"url":p.get("url"),"owner":p.get("owner"),
          "source":p.get("source"),"tags":p.get("tags"),"description":p.get("description")
        }
        items.append(item); all_items.append(item)
    pages.append({"start":start,"matched":d.get("numberMatched"),"returned":d.get("numberReturned"),"items":items})
    nxt=next((z.get("href") for z in d.get("links",[]) if z.get("rel")=="next"),None)
    if not nxt or not feats: break
    start += len(feats)
    if start > 500: break

filtered=[x for x in all_items if any(k in json.dumps(x,ensure_ascii=False).lower() for k in ["aed","除細動","救急"])]
out={"pages":pages,"total_items":len(all_items),"filtered":filtered}
Path("data/import_reports/20260912_setagaya_hub_search_api.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"total_items":len(all_items),"filtered":filtered},ensure_ascii=False)[:50000])
