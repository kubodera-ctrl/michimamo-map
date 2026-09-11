#!/usr/bin/env python3
import json, requests
from pathlib import Path

queries={
  "setagaya_aed_nodes": '''[out:json][timeout:60];
    area["boundary"="administrative"]["name"="世田谷区"]->.a;
    (
      node["emergency"="defibrillator"](area.a);
      way["emergency"="defibrillator"](area.a);
      relation["emergency"="defibrillator"](area.a);
    );
    out center tags;''',
  "setagaya_aed_any": '''[out:json][timeout:60];
    area["boundary"="administrative"]["name"="世田谷区"]->.a;
    (
      nwr["emergency"="defibrillator"](area.a);
      nwr["defibrillator"](area.a);
      nwr["aed"](area.a);
    );
    out center tags;'''
}
out={}
for name,q in queries.items():
    try:
        r=requests.post("https://overpass-api.de/api/interpreter",data={"data":q},timeout=90,headers={"User-Agent":"machimamo-map/1.0"})
        out[name]={"status":r.status_code,"elements":r.json().get("elements",[]) if r.ok else [],"text":"" if r.ok else r.text[:2000]}
    except Exception as e:
        out[name]={"error":f"{type(e).__name__}: {e}","elements":[]}
Path("data/import_reports/20260912_setagaya_osm_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:{"status":v.get("status"),"count":len(v.get("elements",[])),"error":v.get("error")} for k,v in out.items()},ensure_ascii=False))
