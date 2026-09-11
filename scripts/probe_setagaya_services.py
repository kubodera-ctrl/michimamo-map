#!/usr/bin/env python3
import json, urllib.request
from pathlib import Path
urls=[
"https://services3.arcgis.com/iH4Iz7CEdh5xTJYb/arcgis/rest/services/01_AED/FeatureServer",
"https://services3.arcgis.com/iH4Iz7CEdh5xTJYb/arcgis/rest/services/AED2/FeatureServer",
]
out={}
for base in urls:
    req=urllib.request.Request(base+"?f=json",headers={"User-Agent":"machimamo-map/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r: meta=json.load(r)
    rec={"meta":{k:meta.get(k) for k in ("serviceDescription","description","copyrightText","layers","tables","maxRecordCount")}}
    layers=[]
    for layer in meta.get("layers",[]):
        lid=layer["id"]
        q=f"{base}/{lid}/query?where=1%3D1&returnCountOnly=true&f=json"
        req=urllib.request.Request(q,headers={"User-Agent":"machimamo-map/1.0"})
        with urllib.request.urlopen(req,timeout=30) as r: count=json.load(r)
        layers.append({"id":lid,"name":layer.get("name"),"count":count})
    rec["layers"]=layers
    out[base]=rec
Path("data/import_reports/20260912_setagaya_services_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False))
