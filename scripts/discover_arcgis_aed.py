#!/usr/bin/env python3
import json, urllib.parse, urllib.request
from pathlib import Path

def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"machimamo-map-arcgis-discovery/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return json.load(r)

out={}
item_id="dc02f04286954fd9857df355948d1323"
item=get(f"https://www.arcgis.com/sharing/rest/content/items/{item_id}?f=json")
out["setagaya_item"]={k:item.get(k) for k in ("id","title","owner","type","url","access","licenseInfo","modified","description","tags")}

queries=["渋谷区 AED","AED 渋谷","AED type:\"Feature Service\" 渋谷","AED type:\"Feature Service\" Setagaya"]
for q in queries:
    url="https://www.arcgis.com/sharing/rest/search?"+urllib.parse.urlencode({"q":q,"f":"json","num":100})
    try:
        data=get(url)
        rows=[]
        for x in data.get("results",[]):
            blob=" ".join(map(str,[x.get("title"),x.get("description"),x.get("snippet"),x.get("tags")]))
            if "AED" not in blob.upper() and "ＡＥＤ" not in blob:
                continue
            rows.append({k:x.get(k) for k in ("id","title","owner","type","url","access","modified","snippet","tags")})
        out[q]=rows[:50]
    except Exception as e:
        out[q]=[{"error":f"{type(e).__name__}: {e}"}]
Path("data/import_reports/20260912_arcgis_aed_discovery_summary.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:20000])
