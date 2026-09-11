#!/usr/bin/env python3
import json, requests
from pathlib import Path

base="https://hub.arcgis.com/api/search/v1/collections/all/items"
cases=[
 ("group",{"filter":"((group IN (3e6b333b00c8490f91688824b40d92e2)))","limit":100}),
 ("owner_q_aed",{"filter":"((owner IN (setajosei)))","limit":100,"q":"AED"}),
 ("org_q_aed",{"filter":"((orgid IN (HEXYbKoojU2pCBN0)))","limit":100,"q":"AED"}),
 ("source_q_aed",{"filter":"((source IN (世田谷区)))","limit":100,"q":"AED"}),
 ("owner_all",{"filter":"((owner IN (setajosei)))","limit":100}),
 ("org_all",{"filter":"((orgid IN (HEXYbKoojU2pCBN0)))","limit":100}),
]
out={}
for name,params in cases:
    try:
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
        out[name]={"status":r.status_code,"url":r.url,"matched":d.get("numberMatched"),"returned":d.get("numberReturned"),"items":items}
    except Exception as e:
        out[name]={"error":f"{type(e).__name__}: {e}"}
Path("data/import_reports/20260912_setagaya_hub_search_api.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
for name,v in out.items():
    filtered=[x for x in v.get("items",[]) if any(k in json.dumps(x,ensure_ascii=False).lower() for k in ["aed","除細動","救急"])]
    print(json.dumps({"case":name,"matched":v.get("matched"),"filtered":filtered},ensure_ascii=False)[:30000])
