#!/usr/bin/env python3
"""Geocode address-only municipal AED open data using the Digital Agency ABR geocoder CLI."""
from __future__ import annotations
import argparse, hashlib, json, subprocess
from pathlib import Path
from typing import Any

from import_aed_open_data import (
    NAME_FIELDS, ADDRESS_FIELDS, PHONE_FIELDS, MUNICIPALITY_FIELDS,
    first_value, normalized, read_records, fetch, resolve_resource_url, sql_text
)

def collect_rows(source: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    url = resolve_resource_url(source)
    payload = fetch(url)
    rows = read_records(payload)
    result=[]
    outside=0
    restricted=0
    for raw in rows:
        restriction = first_value(raw, ('外部利用不可',))
        if restriction and restriction.lower() not in ('0','false','なし','無'):
            restricted += 1
            continue
        name=first_value(raw, NAME_FIELDS)
        address=first_value(raw, ADDRESS_FIELDS)
        row_muni=first_value(raw, MUNICIPALITY_FIELDS)
        if row_muni and row_muni != source['municipality']:
            outside += 1
            continue
        if not name or not address:
            continue
        if not address.startswith(source['municipality']) and not address.startswith(source['prefecture']+source['municipality']):
            address=source['municipality']+address
        if not address.startswith(source['prefecture']):
            address=source['prefecture']+address
        result.append({
            "name":name,
            "address":address,
            "phone":first_value(raw,PHONE_FIELDS) or None
        })
    return result,{
        "dataset_id":source['dataset_id'],"municipality":source['municipality'],
        "resource_url":url,"source_rows":len(rows),"candidate_rows":len(result),
        "outside_municipality":outside,"restricted":restricted,
        "sha256":hashlib.sha256(payload).hexdigest()
    }

def run_abrg(addresses:list[str]) -> list[dict[str,Any]]:
    if not addresses:
        return []
    proc=subprocess.run(
        ["node","scripts/geocode_with_geolonia.mjs"],
        input="\n".join(addresses)+"\n",
        text=True,capture_output=True,timeout=1800
    )
    if proc.returncode != 0:
        raise RuntimeError("Geolonia geocoder failed: " + proc.stderr[-2000:])
    rows=[]
    for line in proc.stdout.splitlines():
        if not line.strip():
            continue
        raw=json.loads(line)
        rows.append({"result":{
            "city":raw.get("city") or "",
            "lat":raw.get("lat"),
            "lon":raw.get("lon"),
            "match_level":raw.get("level"),
            "other":(raw.get("town") or "") + (raw.get("addr") or "")
        }})
    return rows
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest",type=Path,required=True)
    ap.add_argument("--output-sql",type=Path,required=True)
    ap.add_argument("--output-report",type=Path,required=True)
    args=ap.parse_args()
    manifest=json.loads(args.manifest.read_text(encoding="utf-8"))
    values=[]
    reports=[]
    seen=set()

    for source in manifest["sources"]:
        try:
            rows,report=collect_rows(source)
        except Exception as e:
            reports.append({
                "dataset_id":source["dataset_id"],"municipality":source["municipality"],
                "resource_url":source.get("resource_url"),"generated_rows":0,
                "error":f"{type(e).__name__}: {e}"
            })
            print(f"{source['municipality']} fetch/parse failed: {type(e).__name__}: {e}",flush=True)
            continue
        geocoded=run_abrg([r["address"] for r in rows]) if rows else []
        generated=0
        unmatched=[]
        match_counts={}
        for row,geo in zip(rows,geocoded):
            res=geo.get("result") or {}
            lat=res.get("lat"); lon=res.get("lon")
            city=normalized(res.get("city"))
            level=res.get("match_level")
            if lat is None or lon is None or (city and city != source["municipality"]):
                unmatched.append({"name":row["name"],"address":row["address"],"city":city,"match_level":level})
                continue
            try:
                lat=float(lat); lon=float(lon)
            except Exception:
                unmatched.append({"name":row["name"],"address":row["address"],"city":city,"match_level":level})
                continue
            if not (20 <= lat <= 46 and 122 <= lon <= 154):
                unmatched.append({"name":row["name"],"address":row["address"],"city":city,"match_level":level})
                continue
            digest=hashlib.sha256(f"{source['municipality']}|{row['name']}|{row['address']}".encode()).hexdigest()[:24]
            key=f"municipal-open-data:{source['dataset_id']}:{digest}"
            if key in seen:
                continue
            seen.add(key)
            match_counts[str(level)]=match_counts.get(str(level),0)+1
            generated += 1
            values.append("(" + ",".join([
                sql_text(key),sql_text("aed"),sql_text(row["name"]),sql_text(source["prefecture"]),
                sql_text(source["municipality"]),sql_text(row["address"]),sql_text(row["phone"]),"null",
                str(lat),str(lon),sql_text(source["source_name"]),sql_text(source["dataset_url"]),
                sql_text(source.get("source_date")),sql_text(source["license"]),
                sql_text("ABRジオコーダー"),sql_text(normalized(res.get("other")) or None)
            ]) + ")")
        report.update({"generated_rows":generated,"unmatched_count":len(unmatched),"match_levels":match_counts,"unmatched":unmatched[:100]})
        reports.append(report)
        print(f"{source['municipality']} candidates={len(rows)} generated={generated} unmatched={len(unmatched)}",flush=True)

    if not values:
        raise SystemExit("No safely geocoded rows")
    sql=("begin;\n\ninsert into public.safety_spots "
         "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,"
         "source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
         + ",\n".join(values)
         + "\non conflict (source_key) do update set facility_type=excluded.facility_type,name=excluded.name,"
           "prefecture=excluded.prefecture,municipality=excluded.municipality,address=excluded.address,"
           "phone=excluded.phone,parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
           "source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,"
           "source_license=excluded.source_license,geocode_source=excluded.geocode_source,"
           "geocoded_title=excluded.geocoded_title,active=true,updated_at=now();\n\ncommit;\n")
    args.output_sql.write_text(sql,encoding="utf-8")
    args.output_report.write_text(json.dumps({"generated_rows":len(values),"sources":reports},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
