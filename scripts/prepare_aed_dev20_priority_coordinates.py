#!/usr/bin/env python3
"""Normalize coordinate-complete priority-area AED sources for dev20.

Inputs are official source snapshots downloaded separately. The script keeps
byte-identical originals, excludes lending-only rows, and emits a guarded SQL
batch. It does not connect to Supabase.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
RAW = OUT / "raw"

SOURCES = {
    "hino": {
        "filename": "hino.csv",
        "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132128d3000000008",
        "resource_url": "https://www.city.hino.lg.jp/_res/projects/default_project/_page_/001/026/905/132128_aed.csv",
        "source_name": "日野市 AED設置個所一覧",
        "source_updated_at": "2025-12-12T09:46:55.630294+00:00",
    },
    "mitaka": {
        "filename": "mitaka.csv",
        "source_url": "https://catalog.data.metro.tokyo.lg.jp/dataset/t132047d0000000003",
        "resource_url": "https://www.city.mitaka.lg.jp/c_service/074/attached/attach_74205_5.csv",
        "source_name": "三鷹市 市関係施設に設置しているAED",
        "source_updated_at": "2025-12-12T09:01:53.058877+00:00",
    },
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize_space(value: object) -> str:
    return re.sub(r"[\t\r\n ]+", " ", str(value or "")).strip()


def availability(row: dict) -> str | None:
    parts = [
        normalize_space(row.get("利用可能曜日")),
        normalize_space(row.get("開始時間")),
        normalize_space(row.get("終了時間")),
        normalize_space(row.get("利用可能日時特記事項")),
    ]
    value = " / ".join(part for part in parts if part)
    return value or None


def row_key(dataset: str, external_id: str, name: str, address: str, installation: str) -> str:
    stable = f"{dataset}|{external_id}|{name}|{address}|{installation}"
    return f"dev20-priority:{dataset}:" + hashlib.sha256(stable.encode()).hexdigest()[:24]


def hino_rows(path: Path) -> tuple[list[dict], list[dict]]:
    source = SOURCES["hino"]
    accepted, held = [], []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for number, row in enumerate(csv.DictReader(handle), 2):
            name = normalize_space(row.get("名称"))
            address = normalize_space(row.get("所在地_連結表記"))
            installation = normalize_space(row.get("設置位置"))
            if "貸出用" in name:
                held.append({"source_row": number, "name": name, "address": address, "reason": "lending_only"})
                continue
            if normalize_space(row.get("外部利用不可")) not in ("", "0", "false", "False"):
                held.append({"source_row": number, "name": name, "address": address, "reason": "external_use_unavailable"})
                continue
            try:
                latitude, longitude = float(row["緯度"]), float(row["経度"])
            except (TypeError, ValueError):
                held.append({"source_row": number, "name": name, "address": address, "reason": "missing_coordinate"})
                continue
            external_id = normalize_space(row.get("ID")) or str(number)
            accepted.append({
                "source_key": row_key("hino", external_id, name, address, installation),
                "source_external_id": external_id,
                "name": name,
                "prefecture": "東京都",
                "municipality": "日野市",
                "address": address,
                "phone": normalize_space(row.get("電話番号")) or None,
                "latitude": latitude,
                "longitude": longitude,
                "installation_location": installation or None,
                "availability": availability(row),
                "prefecture_code": "13",
                "municipality_code": "13212",
                "quality_rank": "A",
                "geocode_source": "自治体公式オープンデータ座標",
                "source_license": "CC BY 4.0",
                **source,
                "source_row": number,
            })
    return accepted, held


def mitaka_rows(path: Path) -> tuple[list[dict], list[dict]]:
    source = SOURCES["mitaka"]
    raw = list(csv.reader(path.read_text(encoding="cp932").splitlines()))
    headers = raw[2]
    accepted, held = [], []
    for number, values in enumerate(raw[3:], 4):
        if not any(values):
            continue
        row = dict(zip(headers, values))
        name = normalize_space(row.get("名称"))
        address = normalize_space(row.get("所在地"))
        if address and not address.startswith("東京都"):
            address = "東京都" + address
        try:
            latitude, longitude = float(row["緯度"]), float(row["経度"])
        except (TypeError, ValueError):
            held.append({"source_row": number, "name": name, "address": address, "reason": "missing_coordinate"})
            continue
        external_id = normalize_space(row.get("FIXEDID")) or str(number)
        accepted.append({
            "source_key": row_key("mitaka", external_id, name, address, ""),
            "source_external_id": external_id,
            "name": name,
            "prefecture": "東京都",
            "municipality": "三鷹市",
            "address": address,
            "phone": normalize_space(row.get("電話番号")) or None,
            "latitude": latitude,
            "longitude": longitude,
            "installation_location": None,
            "availability": None,
            "prefecture_code": "13",
            "municipality_code": "13204",
            "quality_rank": "A",
            "geocode_source": "自治体公式オープンデータ座標",
            "source_license": "CC BY 4.0",
            **source,
            "source_row": number,
        })
    return accepted, held


def sql_literal(value: object) -> str:
    return "'" + json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("'", "''") + "'::jsonb"


def build_sql(rows: list[dict]) -> str:
    payload = [{key: row.get(key) for key in (
        "source_key", "source_external_id", "name", "prefecture", "municipality", "address",
        "phone", "latitude", "longitude", "source_name", "source_url", "source_license",
        "source_updated_at", "prefecture_code", "installation_location", "availability",
        "geocode_source",
    )} for row in rows]
    return f"""begin;
create temp table dev20_priority_aed on commit drop as
select * from jsonb_to_recordset({sql_literal(payload)}) as x(
 source_key text,source_external_id text,name text,prefecture text,municipality text,address text,
 phone text,latitude double precision,longitude double precision,source_name text,source_url text,
 source_license text,source_updated_at timestamptz,prefecture_code text,installation_location text,
 availability text,geocode_source text);
do $$ begin
 if (select count(*) from dev20_priority_aed) <> 188 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_priority_aed where name='' or address='' or source_url='' or
   source_license<>'CC BY 4.0' or latitude not between 35.1 and 35.8 or longitude not between 139.2 and 139.8)
 then raise exception 'required-field, license, or coordinate validation failed'; end if;
 if exists(select 1 from dev20_priority_aed c join public.safety_spots p on p.facility_type='aed' and p.active
   and p.prefecture=c.prefecture and p.municipality=c.municipality
   and regexp_replace(lower(p.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')=regexp_replace(lower(c.name),'[^0-9a-z一-龠ぁ-んァ-ヶ]','','g')
   and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g'))
 then raise exception 'production duplicate detected'; end if;
end $$;
insert into public.safety_spots_nationwide_stage(
 source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,
 source_url,source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,
 review_next_action,reviewed_at)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,
 source_url,source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 availability,geocode_source,'verified',false,false,'published',
 '開発20: 自治体公式CC BYデータの施設名・住所・公式座標・自治体範囲・重複を確認',
 '自治体原票更新時に差分確認',now() from dev20_priority_aed
on conflict(source_key) do update set review_decision='published',quality_status='verified',
 review_reason=excluded.review_reason,review_next_action=excluded.review_next_action,reviewed_at=now();
insert into public.safety_spots(
 source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,
 source_url,source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,source_name,
 source_url,source_license,source_updated_at,prefecture_code,source_external_id,installation_location,
 availability,geocode_source,'verified',true,false from dev20_priority_aed
on conflict(source_key) do update set name=excluded.name,address=excluded.address,phone=excluded.phone,
 latitude=excluded.latitude,longitude=excluded.longitude,source_name=excluded.source_name,
 source_url=excluded.source_url,source_license=excluded.source_license,
 source_updated_at=excluded.source_updated_at,source_external_id=excluded.source_external_id,
 installation_location=excluded.installation_location,availability=excluded.availability,
 geocode_source=excluded.geocode_source,quality_status='verified',active=true,
 duplicate_candidate=false,updated_at=now();
do $$ begin if (select count(*) from public.safety_spots p join dev20_priority_aed c using(source_key)
 where p.active and p.facility_type='aed') <> 188 then raise exception 'post-insert validation failed'; end if; end $$;
commit;
"""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    all_rows, all_held, source_evidence = [], [], {}
    for key, loader in (("hino", hino_rows), ("mitaka", mitaka_rows)):
        source_path = args.input_dir / SOURCES[key]["filename"]
        raw_path = RAW / f"{key}_official.csv"
        shutil.copyfile(source_path, raw_path)
        rows, held = loader(source_path)
        all_rows.extend(rows)
        all_held.extend({"dataset": key, **row} for row in held)
        source_evidence[key] = {**SOURCES[key], "sha256": digest(source_path), "rows": len(rows), "held": len(held)}
    assert len(all_rows) == 188
    assert len({row["source_key"] for row in all_rows}) == len(all_rows)
    reasons = Counter(row["reason"] for row in all_held)
    (OUT / "priority_coordinate_candidates.json").write_text(json.dumps(all_rows, ensure_ascii=False, indent=2) + "\n")
    (OUT / "priority_coordinate_holds.json").write_text(json.dumps(all_held, ensure_ascii=False, indent=2) + "\n")
    (OUT / "publish_priority_coordinates.sql").write_text(build_sql(all_rows))
    summary = {
        "processed": len(all_rows) + len(all_held),
        "publishable": len(all_rows),
        "held": len(all_held),
        "hold_reasons": dict(reasons),
        "municipalities": dict(Counter(row["municipality"] for row in all_rows)),
        "quality_rank": "A",
        "policy": "official CC BY coordinates, municipality/address/bounds, required fields, internal identity, and production duplicate guard",
        "sources": source_evidence,
    }
    (OUT / "priority_coordinate_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
