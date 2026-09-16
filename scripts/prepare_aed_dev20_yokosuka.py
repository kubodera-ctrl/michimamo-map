#!/usr/bin/env python3
"""Prepare Yokosuka's three official coordinate-complete AED CSVs."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from pathlib import Path

from prepare_aed_dev20_priority_coordinates import sql_literal


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
RAW = OUT / "raw"
SOURCES = {
    54: ("AEDステーション", "142018_wagamap_lid_54", "2025-04-01T00:15:46.341988+00:00"),
    55: ("AED設置施設（公共施設）", "142018_wagamap_lid_55", "2025-04-01T00:15:46.687185+00:00"),
    56: ("AED設置施設（民間施設）", "142018_wagamap_lid_56", "2025-04-01T00:15:47.069196+00:00"),
}


def compact(value: object) -> str:
    return re.sub(r"[\t\r\n ]+", " ", str(value or "")).strip()


def installation(note: str) -> str | None:
    note = compact(note)
    patterns = (
        r"(?:【設置場所】|設置場所[：:]|AED[：:])\s*([^。\n]+)",
        r"(?:１台目|1台目)[：:]\s*([^。\n]+)",
    )
    for pattern in patterns:
        match = re.search(pattern, note)
        if match:
            return compact(match.group(1))
    return None


def source_key(dataset: int, row_number: int, row: dict) -> str:
    stable = "|".join((str(dataset), str(row_number), row["名称"], row["住所"], row["経度"], row["緯度"]))
    return f"dev20-priority:yokosuka-{dataset}:" + hashlib.sha256(stable.encode()).hexdigest()[:24]


def build_sql(rows: list[dict]) -> str:
    return f"""begin;
create temp table dev20_yokosuka_aed on commit drop as
select * from jsonb_to_recordset({sql_literal(rows)}) as x(
 source_key text,source_external_id text,name text,prefecture text,municipality text,address text,
 phone text,latitude double precision,longitude double precision,source_name text,source_url text,
 source_license text,source_updated_at timestamptz,prefecture_code text,installation_location text,
 availability text,geocode_source text);
do $$ begin
 if (select count(*) from dev20_yokosuka_aed) <> 519 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_yokosuka_aed where name='' or address='' or source_url='' or
  source_license<>'CC BY 4.0' or latitude not between 35.18 and 35.34 or longitude not between 139.59 and 139.75)
 then raise exception 'required-field, license, municipality bounds, or coordinate validation failed'; end if;
 if exists(select 1 from dev20_yokosuka_aed c join public.safety_spots p on p.facility_type='aed' and p.active
  and (p.municipality='横須賀市' or p.address like '%横須賀市%')
  and regexp_replace(lower(p.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')=regexp_replace(lower(c.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')
  and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g')
  and regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g'))
 then raise exception 'production duplicate detected'; end if;
end $$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,
 phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,
 source_external_id,installation_location,availability,geocode_source,quality_status,active,
 duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,
 source_url,source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 availability,geocode_source,'verified',false,false,'published',
 '開発20: 横須賀市公式CC BYデータの施設名・住所・公式座標・市域範囲・設置位置・重複を確認',
 '自治体原票更新時に差分確認',now() from dev20_yokosuka_aed
on conflict(source_key) do update set review_decision='published',quality_status='verified',
 review_reason=excluded.review_reason,review_next_action=excluded.review_next_action,reviewed_at=now();
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,
 longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,
 source_license,source_updated_at,prefecture_code,source_external_id,installation_location,availability,
 geocode_source,'verified',true,false from dev20_yokosuka_aed
on conflict(source_key) do update set name=excluded.name,address=excluded.address,phone=excluded.phone,
 latitude=excluded.latitude,longitude=excluded.longitude,source_name=excluded.source_name,
 source_url=excluded.source_url,source_license=excluded.source_license,source_updated_at=excluded.source_updated_at,
 source_external_id=excluded.source_external_id,installation_location=excluded.installation_location,
 availability=excluded.availability,geocode_source=excluded.geocode_source,quality_status='verified',
 active=true,duplicate_candidate=false,updated_at=now();
do $$ begin if (select count(*) from public.safety_spots p join dev20_yokosuka_aed c using(source_key)
 where p.active and p.facility_type='aed') <> 519 then raise exception 'post-insert validation failed'; end if; end $$;
commit;
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    args = parser.parse_args()
    RAW.mkdir(parents=True, exist_ok=True)
    rows, evidence = [], []
    for dataset, (label, package_id, updated) in SOURCES.items():
        path = args.input_dir / f"yokosuka{dataset}.csv"
        raw_path = RAW / f"yokosuka_{dataset}_official.csv"
        shutil.copyfile(path, raw_path)
        with path.open(encoding="utf-8-sig", newline="") as handle:
            source_rows = list(csv.DictReader(handle))
        for number, row in enumerate(source_rows, 2):
            address = compact(row["住所"])
            if address and not address.startswith("神奈川県"):
                address = "神奈川県横須賀市" + address
            note = compact(row.get("備考"))
            rows.append({
                "source_key": source_key(dataset, number, row),
                "source_external_id": f"{dataset}-{number}",
                "name": compact(row["名称"]),
                "prefecture": "神奈川県",
                "municipality": "横須賀市",
                "address": address,
                "phone": compact(row.get("TEL")) or None,
                "latitude": float(row["緯度"]),
                "longitude": float(row["経度"]),
                "source_name": f"横須賀市 よこすかわが街ガイド {label}",
                "source_url": f"https://data.bodik.jp/dataset/{package_id}",
                "source_license": "CC BY 4.0",
                "source_updated_at": updated,
                "prefecture_code": "14",
                "installation_location": installation(note),
                "availability": note or None,
                "geocode_source": "自治体公式オープンデータ座標",
            })
        evidence.append({
            "dataset": dataset,
            "rows": len(source_rows),
            "catalog_url": f"https://data.bodik.jp/dataset/{package_id}",
            "resource_url": f"https://www2.wagmap.jp/yokosuka/yokosuka/opendatafile/map_3/CSV/opendata_{dataset}.csv",
            "license": "CC BY 4.0",
            "metadata_modified": updated,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
    assert len(rows) == 519 and len({row["source_key"] for row in rows}) == 519
    assert all(35.18 <= row["latitude"] <= 35.34 and 139.59 <= row["longitude"] <= 139.75 for row in rows)
    (OUT / "yokosuka_candidates.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n")
    (OUT / "publish_yokosuka.sql").write_text(build_sql(rows))
    summary = {
        "processed": 519,
        "publishable": 519,
        "held": 0,
        "municipality": "横須賀市",
        "quality_rank": "A",
        "internal_same_name_address_groups": 1,
        "internal_same_name_address_note": "Soleil Hill has five separately located official markers and distinct installation notes/coordinates",
        "policy": "official CC BY coordinates; required fields; Yokosuka bounds; installation-aware internal and production duplicate review",
        "sources": evidence,
    }
    (OUT / "yokosuka_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
