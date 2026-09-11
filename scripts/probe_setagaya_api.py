#!/usr/bin/env python3
import json, requests
from pathlib import Path

item="dc02f04286954fd9857df355948d1323"
group="3e6b333b00c8490f91688824b40d92e2"
urls=[
 f"https://hub.arcgis.com/api/v3/datasets/{item}",
 f"https://hub.arcgis.com/api/v3/datasets/{item}_0",
 f"https://hub.arcgis.com/api/v3/datasets?filter[id]={item}",
 f"https://opendata.arcgis.com/api/v3/datasets/{item}",
 f"https://opendata.arcgis.com/api/v3/datasets/{item}_0",
 f"https://www.arcgis.com/sharing/rest/content/groups/{group}/search?f=json&q=AED&num=100",
 f"https://setagaya.maps.arcgis.com/sharing/rest/content/groups/{group}/search?f=json&q=AED&num=100",
]
out={}
h={"User-Agent":"Mozilla/5.0"}
for u in urls:
 try:
  r=requests.get(u,headers=h,timeout=40)
  try: body=r.json()
  except Exception: body=r.text[:20000]
  out[u]={"status":r.status_code,"final_url":r.url,"body":body}
 except Exception as e:
  out[u]={"error":f"{type(e).__name__}: {e}"}
Path("data/import_reports/20260912_setagaya_api_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:50000])
