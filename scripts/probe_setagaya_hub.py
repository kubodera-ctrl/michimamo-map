#!/usr/bin/env python3
import json, re, requests
from pathlib import Path

item_id="dc02f04286954fd9857df355948d1323"
headers={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
out={}
for host in ["https://www.arcgis.com","https://setagaya.maps.arcgis.com"]:
    for suffix in [f"/sharing/rest/content/items/{item_id}?f=json",f"/sharing/rest/content/items/{item_id}/data?f=json"]:
        url=host+suffix
        try:
            r=requests.get(url,headers=headers,timeout=60)
            try: data=r.json()
            except Exception: data={"text":r.text[:10000]}
            out[url]={"status":r.status_code,"data":data}
        except Exception as e:
            out[url]={"error":f"{type(e).__name__}: {e}"}

hub="https://data-setagaya.opendata.arcgis.com/maps/"+item_id
r=requests.get(hub,headers=headers,timeout=60,allow_redirects=True)
out["hub"]={
    "status":r.status_code,
    "final_url":r.url,
    "feature_servers":sorted(set(re.findall(r'https?://[^"\\\'<> ]+FeatureServer(?:/\\d+)?',r.text))),
    "item_ids":sorted(set(re.findall(r'[0-9a-fA-F]{32}',r.text)))[:300]
}
Path("data/import_reports/20260912_setagaya_hub_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:40000])
