#!/usr/bin/env python3
import json, urllib.parse, urllib.request
from pathlib import Path

def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"machimamo-map-arcgis-discovery/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return json.load(r)

out={}
item_id="dc02f04286954fd9857df355948d1323"
out["setagaya_item"]=get(f"https://www.arcgis.com/sharing/rest/content/items/{item_id}?f=json")
queries=["渋谷区 AED","AED 渋谷","AED owner:city-shibuya","AED type:\"Feature Service\""]
for q in queries:
    url="https://www.arcgis.com/sharing/rest/search?"+urllib.parse.urlencode({"q":q,"f":"json","num":100})
    try:
        out[q]=get(url)
    except Exception as e:
        out[q]={"error":f"{type(e).__name__}: {e}"}
Path("data/import_reports/20260912_arcgis_aed_discovery.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("done")
