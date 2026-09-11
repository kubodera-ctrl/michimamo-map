#!/usr/bin/env python3
import json, re, requests
from pathlib import Path

url="https://data-setagaya.opendata.arcgis.com/maps/dc02f04286954fd9857df355948d1323"
headers={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
out={}
r=requests.get(url,headers=headers,timeout=60,allow_redirects=True)
out["status"]=r.status_code
out["final_url"]=r.url
out["feature_servers"]=sorted(set(re.findall(r'https?://[^"\\\'<> ]+FeatureServer(?:/\\d+)?',r.text)))
out["item_ids"]=sorted(set(re.findall(r'[0-9a-fA-F]{32}',r.text)))[:200]
out["snippet"]=r.text[:5000]
Path("data/import_reports/20260912_setagaya_hub_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in out.items() if k!="snippet"},ensure_ascii=False)[:20000])
