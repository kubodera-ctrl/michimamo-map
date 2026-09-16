#!/usr/bin/env python3
"""Prepare coordinate-complete Nishitokyo and Inagi official XLSX sources."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path

from prepare_aed_dev20_priority_coordinates import availability, normalize_space, row_key, sql_literal


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
RAW = OUT / "raw"
SOURCES = {
    "nishitokyo": {
        "municipality": "西東京市", "code": "13229", "count": 109,
        "xlsx": "nishitokyo.xlsx", "csv": "nishitokyo.csv",
        "source_name": "西東京市 AED設置個所一覧",
        "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132292d0000000007",
        "resource_url": "https://www.opendata.metro.tokyo.lg.jp/nishitokyo/132292_aed.xlsx",
        "updated": "2025-12-12T10:01:05.147632+00:00",
        "bounds": [35.70, 35.77, 139.50, 139.59],
    },
    "inagi": {
        "municipality": "稲城市", "code": "13225", "count": 173,
        "xlsx": "inagi.xlsx", "csv": "inagi.csv",
        "source_name": "稲城市 AED設置個所一覧",
        "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132250d0000000047",
        "resource_url": "https://www.city.inagi.tokyo.jp/_res/projects/default_project/_page_/001/009/446/001_hyojun.xlsx",
        "updated": "2025-12-12T10:00:03.770195+00:00",
        "bounds": [35.59, 35.67, 139.44, 139.54],
    },
}


def build_sql(rows: list[dict]) -> str:
    return f"""begin;
create temp table dev20_tokyo_xlsx_aed on commit drop as select * from jsonb_to_recordset({sql_literal(rows)}) as x(
 source_key text,source_external_id text,name text,prefecture text,municipality text,address text,phone text,
 latitude double precision,longitude double precision,source_name text,source_url text,source_license text,
 source_updated_at timestamptz,prefecture_code text,installation_location text,availability text,geocode_source text);
do $$ begin
 if (select count(*) from dev20_tokyo_xlsx_aed)<>282 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_tokyo_xlsx_aed where name='' or address='' or source_license<>'CC BY 4.0'
  or latitude not between 35.59 and 35.77 or longitude not between 139.44 and 139.59)
 then raise exception 'required-field, license, or coordinate validation failed'; end if;
 if exists(select 1 from dev20_tokyo_xlsx_aed c join public.safety_spots p on p.facility_type='aed' and p.active
  and p.prefecture=c.prefecture and p.municipality=c.municipality
  and regexp_replace(lower(p.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')=regexp_replace(lower(c.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')
  and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g')
  and regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g'))
 then raise exception 'production duplicate detected'; end if;
end $$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,
 phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,
 source_external_id,installation_location,availability,geocode_source,quality_status,active,
 duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,
 source_license,source_updated_at,prefecture_code,source_external_id,installation_location,availability,
 geocode_source,'verified',false,false,'published','開発20: 自治体公式CC BY XLSXの施設名・住所・公式座標・市域範囲・重複を確認',
 '自治体原票更新時に差分確認',now() from dev20_tokyo_xlsx_aed
on conflict(source_key) do update set review_decision='published',quality_status='verified',
 review_reason=excluded.review_reason,review_next_action=excluded.review_next_action,reviewed_at=now();
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,
 longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,
 source_license,source_updated_at,prefecture_code,source_external_id,installation_location,availability,
 geocode_source,'verified',true,false from dev20_tokyo_xlsx_aed
on conflict(source_key) do update set name=excluded.name,address=excluded.address,phone=excluded.phone,
 latitude=excluded.latitude,longitude=excluded.longitude,source_name=excluded.source_name,
 source_url=excluded.source_url,source_license=excluded.source_license,source_updated_at=excluded.source_updated_at,
 source_external_id=excluded.source_external_id,installation_location=excluded.installation_location,
 availability=excluded.availability,geocode_source=excluded.geocode_source,quality_status='verified',active=true,
 duplicate_candidate=false,updated_at=now();
do $$ begin if (select count(*) from public.safety_spots p join dev20_tokyo_xlsx_aed c using(source_key)
 where p.active and p.facility_type='aed')<>282 then raise exception 'post-insert validation failed'; end if; end $$;
commit;
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--converted-dir", type=Path, required=True)
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    rows, evidence = [], []
    for key, source in SOURCES.items():
        raw_path = args.input_dir / source["xlsx"]
        shutil.copyfile(raw_path, RAW / f"{key}_official.xlsx")
        with (args.converted_dir / source["csv"]).open(encoding="utf-8-sig", newline="") as handle:
            source_rows = list(csv.DictReader(handle))
        assert len(source_rows) == source["count"]
        low_lat, high_lat, low_lon, high_lon = source["bounds"]
        for number, row in enumerate(source_rows, 2):
            latitude, longitude = float(row["緯度"]), float(row["経度"])
            assert low_lat <= latitude <= high_lat and low_lon <= longitude <= high_lon
            name = normalize_space(row["名称"])
            address = normalize_space(row["所在地_連結表記"])
            install = normalize_space(row.get("設置位置"))
            external_id = normalize_space(row.get("ID")) or str(number)
            rows.append({
                "source_key": row_key(key, external_id, name, address, install),
                "source_external_id": external_id,
                "name": name, "prefecture": "東京都", "municipality": source["municipality"],
                "address": address, "phone": normalize_space(row.get("電話番号")) or None,
                "latitude": latitude, "longitude": longitude, "source_name": source["source_name"],
                "source_url": source["source_url"], "source_license": "CC BY 4.0",
                "source_updated_at": source["updated"], "prefecture_code": "13",
                "installation_location": install or None, "availability": availability(row),
                "geocode_source": "自治体公式オープンデータ座標",
            })
        evidence.append({
            "municipality": source["municipality"], "rows": len(source_rows),
            "catalog_url": source["source_url"], "resource_url": source["resource_url"],
            "license": "CC BY 4.0", "metadata_modified": source["updated"],
            "sha256": hashlib.sha256(raw_path.read_bytes()).hexdigest(),
        })
    assert len(rows) == 282 and len({row["source_key"] for row in rows}) == 282
    (OUT / "tokyo_xlsx_coordinate_candidates.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    (OUT / "publish_tokyo_xlsx_coordinates.sql").write_text(build_sql(rows))
    summary = {"processed": 282, "publishable": 282, "held": 0,
        "municipalities": {"西東京市": 109, "稲城市": 173}, "quality_rank": "A",
        "policy": "official CC BY XLSX; official coordinates; municipality bounds; required fields; installation-aware duplicate guard",
        "sources": evidence}
    (OUT / "tokyo_xlsx_coordinate_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
