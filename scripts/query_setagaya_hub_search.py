#!/usr/bin/env python3
import json, requests, urllib.parse
from pathlib import Path

group="3e6b333b00c8490f91688824b40d92e2"
base="https://hub.arcgis.com/api/search/v1/collections/all/items"
params={"filter":f"((group IN ({group})))","limit":100,"q":"AED"}
r=requests.get(base,params=params,timeout=60,headers={"User-Agent":"machimamo-map/1.0"})
try:
    data=r.json()
except Exception:
    data={"text":r.text[:50000]}
Path("data/import_reports/20260912_setagaya_hub_search_api.json").write_text(
    json.dumps({"status":r.status_code,"url":r.url,"data":data},ensure_ascii=False,indent=2)+"\n",
    encoding="utf-8"
)
items=[]
raw=data.get("data") or data.get("results") or []
for x in raw:
    attrs=x.get("attributes") or x
    items.append({
        "id":x.get("id") or attrs.get("id"),
        "name":attrs.get("name"),
        "title":attrs.get("title"),
        "type":attrs.get("type"),
        "url":attrs.get("url"),
        "source":attrs.get("source"),
        "owner":attrs.get("owner"),
        "access":attrs.get("access"),
        "tags":attrs.get("tags"),
        "description":attrs.get("description"),
        "extent":attrs.get("extent"),
    })
print(json.dumps({"status":r.status_code,"url":r.url,"count":len(raw),"items":items},ensure_ascii=False)[:60000])
