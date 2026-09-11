#!/usr/bin/env python3
import json, urllib.parse, urllib.request
from pathlib import Path

def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"machimamo-map-arcgis-discovery/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return json.load(r)

wards=["千代田区","世田谷区","渋谷区","北区","荒川区","板橋区","足立区","葛飾区"]
out={}
for ward in wards:
    q=f'{ward} AED type:"Feature Service"'
    url="https://www.arcgis.com/sharing/rest/search?"+urllib.parse.urlencode({"q":q,"f":"json","num":100})
    try:
        data=get(url)
        rows=[]
        for x in data.get("results",[]):
            blob=" ".join(map(str,[x.get("title"),x.get("description"),x.get("snippet"),x.get("tags")]))
            if "AED" not in blob.upper() and "ＡＥＤ" not in blob:
                continue
            rows.append({k:x.get(k) for k in ("id","title","owner","type","url","access","modified","snippet","tags")})
        out[ward]=rows[:50]
    except Exception as e:
        out[ward]=[{"error":f"{type(e).__name__}: {e}"}]

item_id="dc02f04286954fd9857df355948d1323"
try:
    item=get("https://www.arcgis.com/sharing/rest/search?"+urllib.parse.urlencode({"q":f"id:{item_id}","f":"json","num":10}))
    out["setagaya_link_item_search"]=item.get("results",[])
except Exception as e:
    out["setagaya_link_item_search"]=[{"error":f"{type(e).__name__}: {e}"}]

Path("data/import_reports/20260912_arcgis_aed_discovery_summary.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:30000])
