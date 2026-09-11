#!/usr/bin/env python3
import json, urllib.parse, urllib.request
from pathlib import Path

ORGS = {
  "千代田区":"t131016",
  "世田谷区":"t131121",
  "渋谷区":"t131130",
  "北区":"t131172",
  "荒川区":"t131181",
  "板橋区":"t131199",
  "足立区":"t131211",
  "葛飾区":"t131229",
}

BASE="https://catalog.data.metro.tokyo.lg.jp/api/3/action/package_search"

out={}
for muni, org in ORGS.items():
    params=urllib.parse.urlencode({"fq":f"organization:{org}","rows":500})
    url=BASE+"?"+params
    req=urllib.request.Request(url,headers={"User-Agent":"machimamo-map-aed-discovery/1.0"})
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            data=json.load(r)
        results=[]
        for pkg in data.get("result",{}).get("results",[]):
            blob = " ".join([
                str(pkg.get("title") or ""), str(pkg.get("notes") or ""),
                " ".join(str(res.get("name") or "") + " " + str(res.get("url") or "") for res in pkg.get("resources",[]))
            ])
            if not any(key in blob for key in ("AED","ＡＥＤ","aed","自治体標準オープンデータセット","標準オープンデータ")):
                continue
            results.append({
                "id":pkg.get("id"),
                "name":pkg.get("name"),
                "title":pkg.get("title"),
                "notes":pkg.get("notes"),
                "license_id":pkg.get("license_id"),
                "license_title":pkg.get("license_title"),
                "metadata_modified":pkg.get("metadata_modified"),
                "url":pkg.get("url"),
                "resources":[{
                    "id":res.get("id"),
                    "name":res.get("name"),
                    "format":res.get("format"),
                    "url":res.get("url"),
                    "last_modified":res.get("last_modified"),
                    "created":res.get("created"),
                } for res in pkg.get("resources",[])]
            })
        out[muni]={"organization":org,"query_url":url,"count":len(results),"results":results}
    except Exception as e:
        out[muni]={"organization":org,"query_url":url,"error":f"{type(e).__name__}: {e}"}

Path("data/import_reports/20260912_tokyo_remaining_aed_discovery.json").write_text(
    json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:{"count":v.get("count"),"error":v.get("error")} for k,v in out.items()},ensure_ascii=False))
