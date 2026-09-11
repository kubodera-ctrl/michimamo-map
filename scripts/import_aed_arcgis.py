#!/usr/bin/env python3
"""Create AED seed SQL from municipal ArcGIS FeatureServer layers."""
from __future__ import annotations
import argparse, hashlib, json, urllib.parse, urllib.request, unicodedata
from pathlib import Path
from typing import Any

NAME_FIELDS=("名称","施設名称","施設名","設置施設名","AED設置施設名称","設置場所","name","NAME","Name")
ADDRESS_FIELDS=("住所","所在地","所在地_連結表記","所在地連結表記","address","ADDRESS","Address")
PHONE_FIELDS=("電話番号","電話","TEL","tel","phone","PHONE")

def norm(v:Any)->str:
    return unicodedata.normalize("NFKC",str(v or "")).strip()

def first(attrs:dict[str,Any], candidates:tuple[str,...])->str:
    n={norm(k).replace(" ","").lower():norm(v) for k,v in attrs.items()}
    for c in candidates:
        v=n.get(norm(c).replace(" ","").lower(),"")
        if v:return v
    return ""

def get_json(url:str)->dict[str,Any]:
    req=urllib.request.Request(url,headers={"User-Agent":"machimamo-map-arcgis-import/1.0"})
    with urllib.request.urlopen(req,timeout=60) as r:return json.load(r)

def sql_text(v:str|None)->str:
    return "null" if not v else "'" + v.replace("'","''") + "'"

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest",type=Path,required=True)
    ap.add_argument("--output-sql",type=Path,required=True)
    ap.add_argument("--output-report",type=Path,required=True)
    args=ap.parse_args()
    manifest=json.loads(args.manifest.read_text(encoding="utf-8"))
    values=[]; reports=[]; seen=set()
    for source in manifest["sources"]:
        base=source["service_url"].rstrip("/")
        layer_id=source.get("layer_id",0)
        meta=get_json(f"{base}/{layer_id}?f=json")
        params=urllib.parse.urlencode({
            "where":"1=1","outFields":"*","returnGeometry":"true","outSR":"4326",
            "f":"json","resultRecordCount":source.get("max_records",5000)
        })
        data=get_json(f"{base}/{layer_id}/query?{params}")
        features=data.get("features",[])
        generated=0; skipped=0
        samples=[]
        for feat in features:
            attrs=feat.get("attributes") or {}
            geom=feat.get("geometry") or {}
            name=first(attrs,NAME_FIELDS)
            address=first(attrs,ADDRESS_FIELDS)
            phone=first(attrs,PHONE_FIELDS) or None
            lat=geom.get("y"); lon=geom.get("x")
            if (lat is None or lon is None) and "latitude" in attrs and "longitude" in attrs:
                lat=attrs.get("latitude"); lon=attrs.get("longitude")
            if not name:
                skipped+=1
                if len(samples)<3:samples.append({"attrs":attrs,"geometry":geom})
                continue
            try:
                lat=float(lat);lon=float(lon)
            except Exception:
                skipped+=1
                if len(samples)<3:samples.append({"attrs":attrs,"geometry":geom})
                continue
            if not (20<=lat<=46 and 122<=lon<=154):
                skipped+=1;continue
            if address and not address.startswith(source["prefecture"]):
                if address.startswith(source["municipality"]):
                    address=source["prefecture"]+address
                else:
                    address=source["prefecture"]+source["municipality"]+address
            oid=attrs.get(meta.get("objectIdField")) or attrs.get("OBJECTID") or attrs.get("FID")
            stable=str(oid) if oid is not None else f"{name}|{address}|{lat}|{lon}"
            digest=hashlib.sha256(stable.encode()).hexdigest()[:24]
            key=f"municipal-arcgis:{source['dataset_id']}:{digest}"
            if key in seen:continue
            seen.add(key);generated+=1
            values.append("(" + ",".join([
                sql_text(key),sql_text("aed"),sql_text(name),sql_text(source["prefecture"]),
                sql_text(source["municipality"]),sql_text(address or None),sql_text(phone),"null",
                str(lat),str(lon),sql_text(source["source_name"]),sql_text(source["dataset_url"]),
                sql_text(source.get("source_date")),sql_text(source["license"]),
                sql_text("自治体公式ArcGIS"),"null"
            ]) + ")")
        reports.append({
            "dataset_id":source["dataset_id"],"municipality":source["municipality"],
            "service_url":source["service_url"],"layer_id":layer_id,"layer_name":meta.get("name"),
            "feature_count":len(features),"generated_rows":generated,"skipped":skipped,
            "fields":[f.get("name") for f in meta.get("fields",[])],"diagnostic_samples":samples
        })
        print(f"{source['municipality']} features={len(features)} generated={generated} skipped={skipped}",flush=True)
    if not values:raise SystemExit("No valid ArcGIS AED rows")
    sql=("begin;\n\ninsert into public.safety_spots "
         "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,"
         "source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
         + ",\n".join(values)
         + "\non conflict (source_key) do update set facility_type=excluded.facility_type,name=excluded.name,"
         "prefecture=excluded.prefecture,municipality=excluded.municipality,address=excluded.address,"
         "phone=excluded.phone,parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
         "source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,"
         "source_license=excluded.source_license,geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,"
         "active=true,updated_at=now();\n\ncommit;\n")
    args.output_sql.write_text(sql,encoding="utf-8")
    args.output_report.write_text(json.dumps({"generated_rows":len(values),"sources":reports},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":main()
