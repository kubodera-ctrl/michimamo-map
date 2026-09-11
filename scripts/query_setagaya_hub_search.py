#!/usr/bin/env python3
import json, requests
from pathlib import Path

base="https://hub.arcgis.com/api/search/v1/collections/all/items"
out={}
for limit in [100,300,500]:
    params={"filter":"((owner IN (setajosei)))","limit":limit}
    r=requests.get(base,params=params,timeout=60,headers={"User-Agent":"machimamo-map/1.0"})
    d=r.json()
    feats=d.get("features",[])
    items=[]
    for x in feats:
        p=x.get("properties") or {}
        items.append({
          "id":x.get("id"),"title":p.get("name") or p.get("title"),
          "type":p.get("type"),"url":p.get("url"),"owner":p.get("owner"),
          "source":p.get("source"),"tags":p.get("tags"),"description":p.get("description")
        })
    out[str(limit)]={"matched":d.get("numberMatched"),"returned":d.get("numberReturned"),"links":d.get("links"),"items":items}
Path("data/import_reports/20260912_setagaya_hub_search_api.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
for name,v in out.items():
    filtered=[x for x in v["items"] if any(k in json.dumps(x,ensure_ascii=False).lower() for k in ["aed","除細動","救急"])]
    print(json.dumps({"limit":name,"matched":v["matched"],"returned":v["returned"],"filtered":filtered,"links":v["links"]},ensure_ascii=False)[:30000])
