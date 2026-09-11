#!/usr/bin/env python3
import json, requests
from pathlib import Path

TARGET="https://www.city.setagaya.lg.jp/documents/3038/aedichiran.pdf"
h={"User-Agent":"machimamo-map/1.0"}
colls=requests.get("https://index.commoncrawl.org/collinfo.json",headers=h,timeout=60).json()
out={"target":TARGET,"matches":[]}
for coll in colls[:12]:
    api=coll["cdx-api"]
    try:
        r=requests.get(api,params={"url":TARGET,"output":"json","filter":"status:200"},headers=h,timeout=45)
        if r.status_code != 200 or not r.text.strip():
            continue
        for line in r.text.splitlines():
            try:
                rec=json.loads(line)
            except Exception:
                continue
            rec["_index"]=coll.get("id")
            out["matches"].append(rec)
        if out["matches"]:
            break
    except Exception as e:
        out.setdefault("errors",[]).append({"index":coll.get("id"),"error":str(e)})

Path("data/import_reports/20260912_setagaya_commoncrawl.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"collections_checked":[x.get("id") for x in colls[:12]],"matches":out["matches"][:10]},ensure_ascii=False))
