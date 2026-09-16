#!/usr/bin/env python3
"""Prepare Daito official AED rows using strict current ABR parcel coordinates."""

from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

from prepare_aed_dev20_priority_coordinates import normalize_space, row_key, sql_literal
from reprocess_aed_dev20_local_holds import build_parcel_index, choose_match, compact_address


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
RAW = OUT / "raw" / "daito_official.xlsx"
CONVERTED = Path("/tmp/daito_official.csv")
ABR = Path("/tmp/machimamo-abr-formal-dev20")
SOURCE_URL = "https://data.bodik.jp/dataset/1666dc4a-3def-4181-94e1-ae288002791e"


def build_sql(rows: list[dict]) -> str:
    count = len(rows)
    return f"""begin;
create temp table dev20_daito_aed on commit drop as select * from jsonb_to_recordset({sql_literal(rows)}) as x(
 source_key text,source_external_id text,name text,prefecture text,municipality text,address text,
 latitude double precision,longitude double precision,source_name text,source_url text,source_license text,
 source_updated_at timestamptz,prefecture_code text,installation_location text,geocode_source text,geocoded_title text);
do $$ begin
 if (select count(*) from dev20_daito_aed)<>{count} then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_daito_aed where name='' or address='' or source_license<>'CC BY 2.1 JP'
   or latitude not between 34.65 and 34.8 or longitude not between 135.55 and 135.7)
 then raise exception 'required-field, license, or boundary validation failed'; end if;
 if exists(select 1 from dev20_daito_aed c join public.safety_spots p on p.facility_type='aed' and p.active
   and p.prefecture='大阪府' and p.municipality='大東市'
   and regexp_replace(lower(p.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')=regexp_replace(lower(c.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')
   and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g')
   and regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g'))
 then raise exception 'production duplicate detected'; end if;
end $$;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,latitude,longitude,
 source_name,source_url,source_date,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,geocode_source,geocoded_title,quality_status,active,duplicate_candidate)
select source_key,'aed',name,prefecture,municipality,address,latitude,longitude,source_name,source_url,
 date '2023-11-30',source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 geocode_source,geocoded_title,'verified',true,false from dev20_daito_aed
on conflict(source_key) do update set name=excluded.name,address=excluded.address,latitude=excluded.latitude,
 longitude=excluded.longitude,source_name=excluded.source_name,source_url=excluded.source_url,
 source_date=excluded.source_date,source_license=excluded.source_license,source_updated_at=excluded.source_updated_at,
 installation_location=excluded.installation_location,geocode_source=excluded.geocode_source,
 geocoded_title=excluded.geocoded_title,quality_status='verified',active=true,duplicate_candidate=false,updated_at=now();
do $$ begin if (select count(*) from public.safety_spots p join dev20_daito_aed c using(source_key)
 where p.active and p.facility_type='aed')<>{count} then raise exception 'post-insert validation failed'; end if; end $$;
commit;
"""


def main() -> None:
    rows = list(csv.DictReader(CONVERTED.open(encoding="utf-8-sig")))
    assert len(rows) == 85
    index, evidence = build_parcel_index(ABR, "27218", {"prefecture": "大阪府", "municipality": "大東市"})
    accepted, held = [], []
    for number, row in enumerate(rows, 2):
        name = normalize_space(row.get("名称"))
        address = normalize_space(row.get("所在地_連結表記"))
        if address and not address.startswith("大阪府"):
            address = "大阪府" + address
        installation = normalize_space(row.get("設置位置"))
        match = choose_match(compact_address(address, "大阪府", "大東市"), index)
        if not match:
            held.append({"source_row": number, "name": name, "address": address,
                         "reason": "no_unambiguous_abr_parcel_detail_match"})
            continue
        matched_key, (latitude, longitude) = match
        external_id = normalize_space(row.get("ID")) or str(number)
        accepted.append({
            "source_key": row_key("daito", external_id, name, address, installation),
            "source_external_id": external_id, "name": name, "prefecture": "大阪府",
            "municipality": "大東市", "address": address, "latitude": latitude, "longitude": longitude,
            "source_name": "大東市 AED設置箇所一覧", "source_url": SOURCE_URL,
            "source_license": "CC BY 2.1 JP", "source_updated_at": "2023-11-30T10:39:35.268175+00:00",
            "prefecture_code": "27", "installation_location": installation or None,
            "geocode_source": "デジタル庁アドレス・ベース・レジストリ地番詳細座標",
            "geocoded_title": matched_key,
        })
    summary = {
        "processed": len(rows), "publishable": len(accepted), "held": len(held), "quality_rank": "B",
        "municipality": "大東市", "source_license": "CC BY 2.1 JP",
        "source_modified": "2023-11-30", "source_sha256": hashlib.sha256(RAW.read_bytes()).hexdigest(),
        "coordinate_policy": "unique current ABR parcel detail only; no representative fallback",
        "abr": evidence,
    }
    (OUT / "daito_candidates.json").write_text(json.dumps(accepted, ensure_ascii=False, indent=2) + "\n")
    (OUT / "daito_holds.json").write_text(json.dumps(held, ensure_ascii=False, indent=2) + "\n")
    (OUT / "daito_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    (OUT / "publish_daito.sql").write_text(build_sql(accepted))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
