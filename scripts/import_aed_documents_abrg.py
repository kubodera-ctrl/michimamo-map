#!/usr/bin/env python3
"""Import municipal AED lists from official HTML/PDF documents and geocode addresses with ABR CLI."""
from __future__ import annotations
import argparse, hashlib, io, json, re, subprocess, unicodedata, urllib.request
from pathlib import Path
from typing import Any
from bs4 import BeautifulSoup
import pdfplumber

def norm(v:Any)->str:
    return unicodedata.normalize("NFKC",str(v or "")).replace("\u3000"," ").strip()

def fetch(url:str)->bytes:
    req=urllib.request.Request(url,headers={"User-Agent":"machimamo-map-aed-doc-import/1.0"})
    with urllib.request.urlopen(req,timeout=60) as r:return r.read()

def html_rows(payload:bytes, source:dict[str,Any])->list[dict[str,str]]:
    soup=BeautifulSoup(payload.decode("utf-8","ignore"),"html.parser")
    rows=[]
    for tr in soup.find_all("tr"):
        cells=[norm(x.get_text(" ",strip=True)) for x in tr.find_all(["th","td"])]
        if len(cells)<2: continue
        if any(k in cells[0] for k in ("施設名","設置施設名")) and any(k in cells[1] for k in ("所在地","住所")):
            continue
        name_col=int(source.get("name_col",0)); address_col=int(source.get("address_col",1))
        if max(name_col,address_col)>=len(cells): continue
        name,address=cells[name_col],cells[address_col]
        if not name or not address or address in ("-","―","ー"): continue
        rows.append({"name":name,"address":address,"phone":""})
    return rows

def pdf_rows(payload:bytes, source:dict[str,Any])->list[dict[str,str]]:
    rows=[]
    with pdfplumber.open(io.BytesIO(payload)) as pdf:
        for page in pdf.pages:
            tables=page.extract_tables() or []
            for table in tables:
                for raw in table:
                    cells=[norm((x or "").replace("\n"," ")) for x in raw]
                    name_col=int(source.get("name_col",1)); address_col=int(source.get("address_col",2))
                    phone_col=source.get("phone_col")
                    if max(name_col,address_col)>=len(cells): continue
                    name,address=cells[name_col],cells[address_col]
                    if not name or not address: continue
                    header=(name+address)
                    if any(k in header for k in ("施設名住所","施設名 所在地","設置施設名施設所在地","施設名称住所")):
                        continue
                    if name in ("施設名","設置施設名","設 置 施 設 名") or address in ("住所","所在地","施設所在地","施 設 所 在 地"):
                        continue
                    phone=""
                    if phone_col is not None and int(phone_col)<len(cells):
                        phone=cells[int(phone_col)]
                    rows.append({"name":name,"address":address,"phone":phone})
    return rows

def run_abrg(addresses:list[str])->list[dict[str,Any]]:
    if not addresses:return []
    proc=subprocess.run(["abrg","-f","json"],input="\n".join(addresses)+"\n",text=True,capture_output=True,timeout=3600)
    if proc.returncode!=0:
        raise RuntimeError("ABR geocoder failed: "+proc.stderr[-2000:])
    out=proc.stdout.strip()
    if not out: raise RuntimeError("ABR geocoder returned no output")
    data=json.loads(out)
    return data if isinstance(data,list) else [data]

def sql_text(v:str|None)->str:
    return "null" if not v else "'" + v.replace("'","''") + "'"

def full_address(address:str,source:dict[str,Any])->str:
    a=norm(address)
    if a.startswith(source["prefecture"]): return a
    if a.startswith(source["municipality"]): return source["prefecture"]+a
    # Skip clearly out-of-ward Japanese addresses
    if re.match(r"^(長野県|埼玉県|千葉県|神奈川県|小平市|江東区|三郷市)",a):
        return a
    return source["prefecture"]+source["municipality"]+a

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--manifest",type=Path,required=True)
    ap.add_argument("--output-sql",type=Path,required=True)
    ap.add_argument("--output-report",type=Path,required=True)
    args=ap.parse_args()
    manifest=json.loads(args.manifest.read_text(encoding="utf-8"))
    values=[];reports=[];seen=set()
    for source in manifest["sources"]:
        payload=fetch(source["resource_url"])
        raw=html_rows(payload,source) if source["source_type"]=="html_table" else pdf_rows(payload,source)
        # dedupe extracted document rows
        unique=[]; local=set()
        for r in raw:
            key=(r["name"],r["address"])
            if key in local:continue
            local.add(key);unique.append(r)
        addresses=[full_address(r["address"],source) for r in unique]
        geos=run_abrg(addresses)
        generated=0;outside=0;unmatched=[];levels={}
        for row,address,geo in zip(unique,addresses,geos):
            # deliberately skip official lists' out-of-ward facilities
            if source["municipality"] not in address and address.startswith(source["prefecture"]):
                outside+=1;continue
            res=geo.get("result") or {}
            city=norm(res.get("city")); lat=res.get("lat");lon=res.get("lon");level=res.get("match_level")
            if city and city!=source["municipality"]:
                outside+=1;continue
            try: lat=float(lat);lon=float(lon)
            except Exception:
                unmatched.append({"name":row["name"],"address":address,"city":city,"match_level":level});continue
            if not (20<=lat<=46 and 122<=lon<=154):
                unmatched.append({"name":row["name"],"address":address,"city":city,"match_level":level});continue
            digest=hashlib.sha256(f"{source['municipality']}|{row['name']}|{address}".encode()).hexdigest()[:24]
            sk=f"municipal-doc:{source['dataset_id']}:{digest}"
            if sk in seen:continue
            seen.add(sk);generated+=1;levels[str(level)]=levels.get(str(level),0)+1
            values.append("(" + ",".join([
                sql_text(sk),sql_text("aed"),sql_text(row["name"]),sql_text(source["prefecture"]),
                sql_text(source["municipality"]),sql_text(address),sql_text(row.get("phone") or None),"null",
                str(lat),str(lon),sql_text(source["source_name"]),sql_text(source["dataset_url"]),
                sql_text(source.get("source_date")),sql_text(source["license"]),
                sql_text("ABRジオコーダー"),sql_text(norm(res.get("other")) or None)
            ]) + ")")
        reports.append({
            "dataset_id":source["dataset_id"],"municipality":source["municipality"],
            "resource_url":source["resource_url"],"extracted_rows":len(raw),"unique_rows":len(unique),
            "generated_rows":generated,"outside_municipality":outside,"unmatched_count":len(unmatched),
            "match_levels":levels,"unmatched":unmatched[:100],
            "sha256":hashlib.sha256(payload).hexdigest()
        })
        print(f"{source['municipality']} extracted={len(raw)} unique={len(unique)} generated={generated} outside={outside} unmatched={len(unmatched)}",flush=True)
    if not values:raise SystemExit("No valid rows generated")
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

if __name__=="__main__":main()
