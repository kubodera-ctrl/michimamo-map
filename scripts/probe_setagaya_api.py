#!/usr/bin/env python3
import json, re, requests, urllib.parse
from pathlib import Path

hub="https://data-setagaya.opendata.arcgis.com/maps/dc02f04286954fd9857df355948d1323"
headers={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
html=requests.get(hub,headers=headers,timeout=60).text
ids=sorted(set(re.findall(r'(?<![0-9A-Fa-f])[0-9A-Fa-f]{32}(?![0-9A-Fa-f])',html)))
out=[]
for item_id in ids:
    rec={"id":item_id}
    for host in ["https://setagaya.maps.arcgis.com","https://www.arcgis.com"]:
        try:
            r=requests.get(f"{host}/sharing/rest/content/items/{item_id}",params={"f":"json"},headers=headers,timeout=20)
            d=r.json()
            if "error" not in d:
                rec.update({k:d.get(k) for k in ("title","type","owner","url","access","tags","description","snippet")})
                rec["host"]=host
                break
        except Exception as e:
            rec.setdefault("errors",[]).append(str(e))
    out.append(rec)

# Also search org content directly by title/keyword in case data item is not embedded in page HTML.
for q in ['AED orgid:HEXYbKoojU2pCBN0','AED owner:* orgid:HEXYbKoojU2pCBN0','"AED設置" orgid:HEXYbKoojU2pCBN0']:
    try:
        d=requests.get("https://www.arcgis.com/sharing/rest/search",params={"f":"json","q":q,"num":100},headers=headers,timeout=30).json()
        out.append({"search":q,"results":[{k:x.get(k) for k in ("id","title","type","owner","url","access","tags")} for x in d.get("results",[])]})
    except Exception as e:
        out.append({"search":q,"error":str(e)})

Path("data/import_reports/20260912_setagaya_item_inventory.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:50000])
