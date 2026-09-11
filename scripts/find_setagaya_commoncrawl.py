#!/usr/bin/env python3
import json, requests
from pathlib import Path

TARGET="https://www.city.setagaya.lg.jp/documents/3038/aedichiran.pdf"
h={"User-Agent":"machimamo-map/1.0"}
apis=[
 "https://web.archive.org/cdx/search/cdx",
 "https://web.archive.org/web/timemap/json"
]
out={"target":TARGET,"cdx":[]}
try:
    r=requests.get(apis[0],params={
      "url":TARGET,"output":"json","filter":"statuscode:200","filter":"mimetype:application/pdf",
      "fl":"timestamp,original,statuscode,mimetype,digest,length","collapse":"digest"
    },headers=h,timeout=90)
    out["cdx_status"]=r.status_code
    out["cdx_text"]=r.text[:20000]
    if r.ok:
        data=r.json()
        if data and isinstance(data,list):
            hdr=data[0]
            out["cdx"]=[dict(zip(hdr,row)) for row in data[1:]]
except Exception as e:
    out["error"]=f"{type(e).__name__}: {e}"

Path("data/import_reports/20260912_setagaya_wayback.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:30000])
