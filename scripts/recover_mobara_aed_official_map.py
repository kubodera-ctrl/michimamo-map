#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path("data/aed_dev17_mobara")
XML_URL = "https://www.city.mobara.chiba.jp/map/xml/21.xml"
PAGE_URL = "https://www.city.mobara.chiba.jp/0000001282.html"
MAP_URL = "https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno="
UA = "machimamo-map-aed-source-audit/2026-09-16"
BASELINE = 45906
BATCH_SIZE = 25


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/xml,text/xml,*/*"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def clean(value: str | None) -> str:
    return " ".join((value or "").replace("\u3000", " ").split())


def sql_text(value: object | None) -> str:
    if value is None or value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def parse_description(value: str | None) -> dict[str, str | None]:
    text = html.unescape(value or "")
    lines = [clean(re.sub(r"<[^>]+>", "", line)) for line in re.split(r"<br\s*/?>", text, flags=re.I)]
    lines = [line for line in lines if line]
    address = None
    for line in lines:
        postal = re.match(r"^〒\d{3}-\d{4}\s*(.*)$", line)
        candidate = clean(postal.group(1)) if postal else line
        if candidate.startswith("千葉県茂原市"):
            address = candidate
            break
        if candidate.startswith("茂原市"):
            address = "千葉県" + candidate
            break
        if postal and candidate:
            address = "千葉県茂原市" + candidate
            break
    phone_line = next((line for line in lines if line.upper().startswith("TEL:")), "")
    phone = clean(phone_line.split(":", 1)[1]) if ":" in phone_line else None
    details = " / ".join(line for line in lines if line != address and not line.startswith("〒") and not line.upper().startswith(("TEL:", "FAX:")))
    return {"address": address, "phone": phone, "details": details or None}


def build_sql(rows: list[dict[str, object]], batch_number: int, baseline: int) -> str:
    values = []
    for row in rows:
        values.append("(" + ",".join([
            sql_text(row["source_key"]), sql_text(row["name"]), sql_text(row["address"]),
            sql_text(row.get("phone")), str(row["latitude"]), str(row["longitude"]),
            sql_text(row.get("details")), sql_text(row.get("mapno")),
        ]) + ")")
    final = baseline + len(rows)
    return f"""begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev17_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,details text,mapno text) on commit drop;
insert into dev17_v values
{',\n'.join(values)};
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>{baseline} then raise exception 'baseline changed'; end if;
if (select count(*) from dev17_v)<>{len(rows)} then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev17_v where name is null or name='' or address not like '千葉県茂原市%' or latitude not between 35.2 and 35.7 or longitude not between 140.0 and 140.6) then raise exception 'invalid row'; end if;
if exists(select 1 from dev17_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev17_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev17_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','{MAP_URL}','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',false,false,'published','自治体公式AED一覧・公式施設マップ座標・範囲・重複をdev17で確認','公開DBへ反映済み',now() from dev17_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','{MAP_URL}','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',true,false from dev17_v;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>{final} then raise exception 'post count mismatch'; end if; end $g$;
select 'dev17_mobara_{batch_number:02d}'::text as batch,{len(rows)} as inserted,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    payload = fetch(XML_URL)
    (OUT / "official_map_21.xml").write_bytes(payload)
    root = ET.fromstring(payload)
    rows = []
    seen_keys = set()
    for index, placemark in enumerate(root.findall("Placemark"), 1):
        name = clean(placemark.findtext("name"))
        mapno = clean(placemark.findtext("mapno"))
        details = parse_description(placemark.findtext("description"))
        latitude = float(placemark.findtext("LookAt/latitude") or "nan")
        longitude = float(placemark.findtext("LookAt/longitude") or "nan")
        source_key = f"municipal-official-map:mobara-aed:{mapno or index}"
        row = {"source_key": source_key, "name": name, "mapno": mapno, "latitude": latitude,
               "longitude": longitude, **details}
        if not name or not details["address"] or not (35.2 <= latitude <= 35.7 and 140.0 <= longitude <= 140.6):
            raise RuntimeError(f"invalid official map row: {row}")
        if source_key in seen_keys:
            raise RuntimeError(f"duplicate source key: {source_key}")
        seen_keys.add(source_key)
        rows.append(row)
    if len(rows) != 91:
        raise RuntimeError(f"official map cardinality changed: {len(rows)}")
    (OUT / "review.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    batches = []
    baseline = BASELINE
    for number, start in enumerate(range(0, len(rows), BATCH_SIZE), 1):
        batch = rows[start:start + BATCH_SIZE]
        filename = f"publish_dev17_mobara_{number:02d}.sql"
        sql = build_sql(batch, number, baseline)
        (OUT / filename).write_text(sql, encoding="utf-8")
        batches.append({"file": filename, "baseline": baseline, "inserted": len(batch),
                        "expected_final": baseline + len(batch), "sha256": hashlib.sha256(sql.encode()).hexdigest()})
        baseline += len(batch)
    summary = {"municipality_code": "12210", "municipality": "茂原市", "source_rows": len(rows),
               "official_xml_url": XML_URL, "official_list_url": PAGE_URL, "xml_sha256": hashlib.sha256(payload).hexdigest(),
               "policy": "自治体公式AED施設マップの施設単位座標のみ。全行の市内範囲・住所・一意キーを検証。DB投入時にも既存重複を停止条件として再検証。",
               "baseline": BASELINE, "expected_final": baseline, "batches": batches}
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
