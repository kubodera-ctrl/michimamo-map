#!/usr/bin/env python3
import json, requests
from pathlib import Path

group="3e6b333b00c8490f91688824b40d92e2"
base="https://hub.arcgis.com/api/search/v1/collections/all/items"
queries=[None,"AED","ＡＥＤ","自動体外式除細動器","救急","設置場所"]
out={}
for q in queries:
    params={"filter":f"((group IN ({group})))","limit":100}
    if q: params["q"]=q
    r=requests.get(base,params=params,timeout=60,headers={"User-Agent":"machimamo-map/1.0"})
    try: data=r.json()
    except Exception: data={"text":r.text[:50000]}
    feats=data.get("features",[])
    items=[]
    for x in feats:
        p=x.get("properties") or {}
        items.append({
            "id":x.get("id"),
            "title":p.get("name") or p.get("title"),
            "type":p.get("type"),
            "url":p.get("url"),
            "source":p.get("source"),
            "owner":p.get("owner"),
            "access":p.get("access"),
            "tags":p.get("tags"),
            "description":p.get("description"),
            "links":x.get("links"),
        })
    out[str(q)]={"status":r.status_code,"url":r.url,"matched":data.get("numberMatched"),"returned":data.get("numberReturned"),"items":items}
Path("data/import_reports/20260912_setagaya_hub_search_api.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:60000])
