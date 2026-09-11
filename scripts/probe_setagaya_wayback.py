#!/usr/bin/env python3
import json, requests
from pathlib import Path

url="https://www.city.setagaya.lg.jp/documents/3038/aedkunaizeniki.pdf"
targets=[
 "https://web.archive.org/cdx/search/cdx?url="+url+"&output=json&filter=statuscode:200&filter=mimetype:application/pdf&fl=timestamp,original,statuscode,mimetype,digest,length&collapse=digest",
 "https://web.archive.org/cdx/search/cdx?url="+url+"&output=json&filter=statuscode:200&fl=timestamp,original,statuscode,mimetype,digest,length"
]
out=[]
h={"User-Agent":"machimamo-map-aed-archive/1.0"}
for u in targets:
    try:
        r=requests.get(u,headers=h,timeout=60)
        out.append({"url":u,"status":r.status_code,"text":r.text[:50000]})
    except Exception as e:
        out.append({"url":u,"error":f"{type(e).__name__}: {e}"})
Path("data/import_reports/20260912_setagaya_wayback_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:50000])
