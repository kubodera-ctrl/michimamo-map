#!/usr/bin/env python3
import json, requests
from pathlib import Path

ids=[
 "dc02f04286954fd9857df355948d1323",
 "b0f844b4b9994e0b9d60fe9de82a0f98",
 "8b61a9a529a849a5accfa63f081303f6"
]
templates=[
 "https://hub.arcgis.com/api/download/v1/items/{id}/csv?layers=0",
 "https://hub.arcgis.com/api/download/v1/items/{id}/geojson?layers=0",
 "https://opendata.arcgis.com/api/v3/datasets/{id}_0/downloads/data?format=csv&spatialRefId=4326&where=1%3D1",
 "https://opendata.arcgis.com/datasets/{id}_0.csv",
 "https://data-setagaya.opendata.arcgis.com/datasets/{id}_0.csv",
]
out=[]
for item_id in ids:
  for tpl in templates:
    url=tpl.format(id=item_id)
    try:
      r=requests.get(url,timeout=90,allow_redirects=True,headers={"User-Agent":"Mozilla/5.0"})
      out.append({
        "id":item_id,"url":url,"status":r.status_code,"final_url":r.url,
        "content_type":r.headers.get("content-type"),"length":len(r.content),
        "head":r.text[:1000] if "text" in (r.headers.get("content-type") or "") or "json" in (r.headers.get("content-type") or "") or "csv" in (r.headers.get("content-type") or "") else ""
      })
    except Exception as e:
      out.append({"id":item_id,"url":url,"error":f"{type(e).__name__}: {e}"})
Path("data/import_reports/20260912_setagaya_download_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
for x in out:
  print(json.dumps({k:x.get(k) for k in ("id","url","status","final_url","content_type","length","head","error")},ensure_ascii=False)[:3000])
