#!/usr/bin/env python3
"""Reprocess dev16-dev18 local AED holds with official ABR residence points.

This script is review-only. It never writes to Supabase. Only current ABR
residence-detail rows with one unambiguous coordinate, an exact municipality
code, and a fully consumed numeric address are accepted as publication
candidates. Town/block representative points are intentionally unsupported.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

from geocode_aed_with_abr import address_key, normalize_address, zip_rows
from import_aed_open_data import read_records


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "aed_dev20"
HELD_GLOBS = (
    "data/aed_dev16_geolonia_strict/*_held.json",
    "data/aed_dev17_geolonia_strict/*_held.json",
    "data/aed_dev18_saitama/strict_geocoding/*_held.json",
)
ABR_URLS = {
    "04": {
        "data": "https://data.address-br.digital.go.jp/mt_rsdtdsp_rsdt/pref/mt_rsdtdsp_rsdt_pref04.csv.zip",
        "position": "https://data.address-br.digital.go.jp/mt_rsdtdsp_rsdt_pos/pref/mt_rsdtdsp_rsdt_pos_pref04.csv.zip",
    },
    "11": {
        "data": "https://data.address-br.digital.go.jp/mt_rsdtdsp_rsdt/pref/mt_rsdtdsp_rsdt_pref11.csv.zip",
        "position": "https://data.address-br.digital.go.jp/mt_rsdtdsp_rsdt_pos/pref/mt_rsdtdsp_rsdt_pos_pref11.csv.zip",
    },
    "12": {
        "data": "https://data.address-br.digital.go.jp/mt_rsdtdsp_rsdt/pref/mt_rsdtdsp_rsdt_pref12.csv.zip",
        "position": "https://data.address-br.digital.go.jp/mt_rsdtdsp_rsdt_pos/pref/mt_rsdtdsp_rsdt_pos_pref12.csv.zip",
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sql_text(value: object) -> str:
    if value is None or value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def compact_address(value: str, prefecture: str, municipality: str) -> str:
    # A whitespace after the numbered address normally starts a building/floor
    # suffix. Remove it before normalization so `1-6-1 3F` cannot be mistaken
    # for the different residence `1-6-13`.
    value = re.sub(r"(?<=[0-9０-９])\s+.*$", "", value.strip())
    value = normalize_address(value, prefecture, municipality)
    value = value.replace("大字", "")
    value = re.sub(r"番地の?", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def code_from_path(path: Path) -> str:
    return path.name.split("_", 1)[0]


def municipality_from_path(path: Path) -> str:
    return path.name.split("_", 2)[1]


def prefecture_for(code: str) -> str:
    return {"04": "宮城県", "11": "埼玉県", "12": "千葉県"}[code[:2]]


def with_check_digit(code: str) -> str:
    weighted = sum(int(digit) * weight for digit, weight in zip(code, (6, 5, 4, 3, 2)))
    check = 11 - weighted % 11
    if check >= 10:
        check = 0
    return code + str(check)


def load_targets() -> tuple[list[dict], dict[str, dict]]:
    rows: list[dict] = []
    targets: dict[str, dict] = {}
    for pattern in HELD_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            code = code_from_path(path)
            municipality = municipality_from_path(path)
            prefecture = prefecture_for(code)
            targets[code] = {
                "code": code,
                "prefecture": prefecture,
                "municipality": municipality,
                "source_file": str(path.relative_to(ROOT)),
            }
            for item in json.loads(path.read_text(encoding="utf-8")):
                rows.append({**item, **targets[code]})
    return rows, targets


def enrich_dev18_rows(rows: list[dict]) -> None:
    recovery = json.loads(
        (ROOT / "data" / "aed_dev18_saitama" / "recovery.json").read_text(encoding="utf-8")
    )
    snapshots = {str(item["code"]): item.get("snapshot") for item in recovery["rows"]}
    cache: dict[str, list[dict]] = {}
    for row in rows:
        if "aed_dev18_saitama" not in row["source_file"]:
            continue
        code = row["code"]
        snapshot = snapshots.get(code)
        if not snapshot:
            continue
        if code not in cache:
            cache[code] = read_records((ROOT / snapshot).read_bytes())
        source_index = int(row.get("row") or 0) - 2
        if source_index < 0 or source_index >= len(cache[code]):
            continue
        raw = cache[code][source_index]
        installation = str(raw.get("設置位置") or "").strip()
        availability_parts = [
            str(raw.get(key) or "").strip()
            for key in ("利用可能曜日", "開始時間", "終了時間", "利用可能日時特記事項")
        ]
        if installation:
            row["installation_location"] = installation
        if any(availability_parts):
            row["availability"] = " / ".join(part for part in availability_parts if part)


def build_prefecture_index(
    abr_dir: Path, prefix: str, target_codes: set[str], targets: dict[str, dict]
) -> tuple[dict[str, dict[str, list[tuple[float, float]]]], dict[str, str]]:
    data_path = abr_dir / f"mt_rsdtdsp_rsdt_pref{prefix}.csv.zip"
    pos_path = abr_dir / f"mt_rsdtdsp_rsdt_pos_pref{prefix}.csv.zip"
    full_codes: dict[str, str] = {}
    positions: dict[tuple[str, str, str, str, str], tuple[float, float]] = {}
    for row in zip_rows(pos_path):
        short = row["lg_code"][:5]
        if short not in target_codes or not row.get("rep_lat") or not row.get("rep_lon"):
            continue
        full_codes[short] = row["lg_code"]
        key = (row["lg_code"], row["machiaza_id"], row["blk_id"], row["rsdt_id"], row["rsdt2_id"])
        positions[key] = (float(row["rep_lat"]), float(row["rep_lon"]))

    index: dict[str, dict[str, list[tuple[float, float]]]] = defaultdict(lambda: defaultdict(list))
    for row in zip_rows(data_path):
        short = row["lg_code"][:5]
        if short not in target_codes or row.get("status_flg") not in (None, "", "0"):
            continue
        key = (row["lg_code"], row["machiaza_id"], row["blk_id"], row["rsdt_id"], row["rsdt2_id"])
        coordinate = positions.get(key)
        if not coordinate:
            continue
        target = targets[short]
        raw_key = address_key(row, include_residence=True)
        normalized = compact_address(raw_key, target["prefecture"], target["municipality"])
        if coordinate not in index[short][normalized]:
            index[short][normalized].append(coordinate)
    return index, full_codes


def parcel_address_key(row: dict[str, str]) -> str:
    town = str(row.get("oaza_cho") or "") + str(row.get("koaza") or "")
    chome = str(row.get("chome") or "").replace("丁目", "")
    numbers = [str(row.get(key) or "") for key in ("prc_num1", "prc_num2", "prc_num3")]
    numbers = [str(int(value)) for value in numbers if value.isdigit()]
    return town + (chome + "-" if chome else "") + "-".join(numbers)


def build_parcel_index(
    abr_dir: Path, code: str, target: dict
) -> tuple[dict[str, list[tuple[float, float]]], dict | None]:
    full_code = with_check_digit(code)
    data_path = abr_dir / f"mt_parcel_city{full_code}.csv.zip"
    pos_path = abr_dir / f"mt_parcel_pos_city{full_code}.csv.zip"
    if not data_path.exists() or not pos_path.exists():
        return {}, None
    positions = {}
    for row in zip_rows(pos_path):
        if row.get("lg_code") != full_code or not row.get("rep_lat") or not row.get("rep_lon"):
            continue
        positions[(row["machiaza_id"], row["prc_id"])] = (float(row["rep_lat"]), float(row["rep_lon"]))
    index: dict[str, list[tuple[float, float]]] = defaultdict(list)
    for row in zip_rows(data_path):
        if row.get("lg_code") != full_code or row.get("ablt_date"):
            continue
        coordinate = positions.get((row["machiaza_id"], row["prc_id"]))
        if not coordinate:
            continue
        normalized = compact_address(
            parcel_address_key(row), target["prefecture"], target["municipality"]
        )
        if normalized and coordinate not in index[normalized]:
            index[normalized].append(coordinate)
    evidence = {
        "data": f"https://data.address-br.digital.go.jp/mt_parcel/city/{data_path.name}",
        "position": f"https://data.address-br.digital.go.jp/mt_parcel_pos/city/{pos_path.name}",
        "data_sha256": sha256(data_path),
        "position_sha256": sha256(pos_path),
    }
    return index, evidence


def choose_match(query: str, index: dict[str, list[tuple[float, float]]]) -> tuple[str, tuple[float, float]] | None:
    matches = []
    for key, coordinates in index.items():
        if query == key:
            suffix = ""
        elif query.startswith(key):
            suffix = query[len(key):]
            if suffix.startswith(("-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9")):
                continue
        else:
            continue
        if len(coordinates) != 1:
            continue
        matches.append((len(key), key, coordinates[0], suffix))
    if not matches:
        return None
    matches.sort(reverse=True)
    best = matches[0]
    if len(matches) > 1 and matches[1][0] == best[0] and matches[1][1] != best[1]:
        return None
    return best[1], best[2]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--abr-dir", type=Path, required=True)
    args = parser.parse_args()
    rows, targets = load_targets()
    enrich_dev18_rows(rows)
    target_codes = set(targets)
    indexes: dict[str, dict[str, list[tuple[float, float]]]] = {}
    parcel_indexes: dict[str, dict[str, list[tuple[float, float]]]] = {}
    full_codes: dict[str, str] = {}
    abr_sources = {}
    for prefix in sorted({code[:2] for code in target_codes}):
        pref_index, pref_codes = build_prefecture_index(
            args.abr_dir, prefix, {code for code in target_codes if code.startswith(prefix)}, targets
        )
        indexes.update(pref_index)
        full_codes.update(pref_codes)
        data_path = args.abr_dir / f"mt_rsdtdsp_rsdt_pref{prefix}.csv.zip"
        pos_path = args.abr_dir / f"mt_rsdtdsp_rsdt_pos_pref{prefix}.csv.zip"
        abr_sources[prefix] = {
            **ABR_URLS[prefix],
            "data_sha256": sha256(data_path),
            "position_sha256": sha256(pos_path),
        }
    parcel_sources = {}
    for code, target in sorted(targets.items()):
        parcel_index, evidence = build_parcel_index(args.abr_dir, code, target)
        parcel_indexes[code] = parcel_index
        full_codes.setdefault(code, with_check_digit(code))
        if evidence:
            parcel_sources[code] = evidence

    accepted = []
    held = []
    reasons: Counter[str] = Counter()
    per_municipality: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        code = row["code"]
        address = str(row.get("address") or "").strip()
        name = str(row.get("name") or "").strip()
        base = {key: value for key, value in row.items() if key != "normalized"}
        if not name or not address:
            reason = "missing_name_or_address"
            held.append({**base, "dev20_reason": reason})
        elif not re.search(r"[0-9０-９]", address):
            reason = "address_without_number"
            held.append({**base, "dev20_reason": reason})
        elif code not in full_codes:
            reason = "abr_municipality_not_available"
            held.append({**base, "dev20_reason": reason})
        else:
            query = compact_address(address, row["prefecture"], row["municipality"])
            match = choose_match(query, indexes.get(code, {}))
            method = "residence_detail"
            if not match:
                match = choose_match(query, parcel_indexes.get(code, {}))
                method = "parcel_detail"
            if not match:
                reason = "no_unambiguous_abr_detail_match"
                held.append({**base, "normalized_query": query, "dev20_reason": reason})
            else:
                matched_key, (latitude, longitude) = match
                reason = f"accepted_{method}"
                accepted.append({
                    **base,
                    "source_key": "dev20-abr-recovery:"
                    + code
                    + ":"
                    + hashlib.sha256(
                        f"{row.get('source_url')}|{row.get('row')}|{name}|{address}".encode()
                    ).hexdigest()[:24],
                    "full_lg_code": full_codes[code],
                    "normalized_query": query,
                    "abr_matched_key": matched_key,
                    "latitude": latitude,
                    "longitude": longitude,
                    "geocode_source": (
                        "デジタル庁アドレス・ベース・レジストリ住居詳細座標"
                        if method == "residence_detail"
                        else "デジタル庁アドレス・ベース・レジストリ地番詳細座標"
                    ),
                    "abr_match_method": method,
                    "quality_rank": "B",
                    "dev20_reason": reason,
                })
        reasons[reason] += 1
        per_municipality[f"{code}_{row['municipality']}"][reason] += 1

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "local_holds_accepted.json").write_text(
        json.dumps(accepted, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "local_holds_remaining.json").write_text(
        json.dumps(held, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    candidate_values = []
    for row in accepted:
        candidate_values.append(
            "(" + ",".join([
                sql_text(row["source_key"]), sql_text(row["code"]), sql_text(row["name"]),
                sql_text(row["prefecture"]), sql_text(row["municipality"]), sql_text(row["address"]),
                str(row["latitude"]), str(row["longitude"]), sql_text(row["source_url"]),
            ]) + ")"
        )
    candidate_check_sql = """with candidates(source_key,municipality_code,name,prefecture,municipality,address,latitude,longitude,source_url) as (values
""" + ",\n".join(candidate_values) + """
), normalized as (
  select c.*,
    regexp_replace(lower(c.name),'[[:space:]　・･\\-ー（）()]','','g') as normalized_name,
    regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g') as normalized_address
  from candidates c
)
select n.source_key,n.municipality_code,n.name,n.municipality,
  count(p.*) filter(where regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=n.normalized_name
    and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=n.normalized_address) as exact_name_address,
  count(p.*) filter(where regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=n.normalized_name
    and abs(p.latitude-n.latitude)<=0.0003 and abs(p.longitude-n.longitude)<=0.0003) as near_same_name,
  count(p.*) filter(where regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=n.normalized_address) as same_address,
  count(p.*) filter(where abs(p.latitude-n.latitude)<=0.00015 and abs(p.longitude-n.longitude)<=0.00015) as within_about_20m
from normalized n
left join public.safety_spots p on p.facility_type='aed' and p.active
 and p.prefecture=n.prefecture and p.municipality=n.municipality
 and (abs(p.latitude-n.latitude)<=0.0003 and abs(p.longitude-n.longitude)<=0.0003
      or regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=n.normalized_address
      or regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=n.normalized_name)
group by n.source_key,n.municipality_code,n.name,n.municipality
order by n.municipality_code,n.source_key;
"""
    (OUT / "local_holds_candidate_check.sql").write_text(candidate_check_sql, encoding="utf-8")
    publish_values = []
    for row in accepted:
        source_name = f"{row['municipality']}公式AED設置情報（デジタル庁ABR住所照合）"
        publish_values.append(
            "(" + ",".join([
                sql_text(row["source_key"]), sql_text(row["name"]), sql_text(row["prefecture"]),
                sql_text(row["municipality"]), sql_text(row["address"]), sql_text(row.get("phone")),
                str(row["latitude"]), str(row["longitude"]), sql_text(source_name),
                sql_text(row["source_url"]), sql_text(row.get("source_license")),
                sql_text(row.get("source_updated_at")), sql_text(row.get("installation_location")),
                sql_text(row.get("availability")), sql_text(row["geocode_source"]),
                sql_text(row["abr_matched_key"]), sql_text(row["code"][:2]),
                sql_text(str(row.get("row") or "")),
            ]) + ")"
        )
    publish_sql = """begin;
create temp table dev20_local_aed_candidates(
 source_key text,name text,prefecture text,municipality text,address text,phone text,
 latitude double precision,longitude double precision,source_name text,source_url text,
 source_license text,source_updated_at timestamptz,installation_location text,availability text,
 geocode_source text,geocoded_title text,prefecture_code text,source_external_id text
) on commit drop;
insert into dev20_local_aed_candidates values
""" + ",\n".join(publish_values) + """;

do $$
begin
 if (select count(*) from dev20_local_aed_candidates) <> 100 then
   raise exception 'dev20 local recovery candidate count changed';
 end if;
 if exists(select 1 from dev20_local_aed_candidates where
   source_key is null or name is null or address is null or source_url is null or source_license is null
   or latitude not between 20 and 46 or longitude not between 122 and 154) then
   raise exception 'dev20 local recovery required-field or coordinate validation failed';
 end if;
 if exists(
   select 1 from dev20_local_aed_candidates c join public.safety_spots p
    on p.facility_type='aed' and p.active and p.prefecture=c.prefecture and p.municipality=c.municipality
   and regexp_replace(lower(p.name),'[[:space:]　・･\\-ー（）()]','','g')=regexp_replace(lower(c.name),'[[:space:]　・･\\-ー（）()]','','g')
   and regexp_replace(lower(p.address),'[[:space:]　\\-－ー丁目番地号]','','g')=regexp_replace(lower(c.address),'[[:space:]　\\-－ー丁目番地号]','','g')
   and regexp_replace(lower(coalesce(p.installation_location,'')),'[[:space:]　]','','g')=regexp_replace(lower(coalesce(c.installation_location,'')),'[[:space:]　]','','g')
 ) then
   raise exception 'dev20 local recovery production duplicate detected';
 end if;
end $$;

insert into public.safety_spots_nationwide_stage(
 source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,
 source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,geocoded_title,quality_status,active,
 duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at
)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,
 source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,geocoded_title,'verified',false,false,
 'published','開発20: デジタル庁ABRの住居詳細または地番詳細座標で番地まで厳格一致',
 '自治体原票またはABR更新時に差分確認',now()
from dev20_local_aed_candidates
on conflict(source_key) do update set
 latitude=excluded.latitude,longitude=excluded.longitude,geocode_source=excluded.geocode_source,
 geocoded_title=excluded.geocoded_title,quality_status='verified',review_decision='published',
 review_reason=excluded.review_reason,review_next_action=excluded.review_next_action,reviewed_at=now();

insert into public.safety_spots(
 source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,
 source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,geocoded_title,quality_status,active,duplicate_candidate
)
select source_key,'aed',name,prefecture,municipality,address,phone,latitude,longitude,
 source_name,source_url,source_license,source_updated_at,prefecture_code,source_external_id,
 installation_location,availability,geocode_source,geocoded_title,'verified',true,false
from dev20_local_aed_candidates
on conflict(source_key) do update set
 name=excluded.name,address=excluded.address,phone=excluded.phone,latitude=excluded.latitude,
 longitude=excluded.longitude,source_name=excluded.source_name,source_url=excluded.source_url,
 source_license=excluded.source_license,source_updated_at=excluded.source_updated_at,
 installation_location=excluded.installation_location,availability=excluded.availability,
 geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,
 quality_status='verified',active=true,duplicate_candidate=false,updated_at=now();

do $$
begin
 if (select count(*) from public.safety_spots p join dev20_local_aed_candidates c using(source_key)
     where p.active and p.facility_type='aed') <> 100 then
   raise exception 'dev20 local recovery post-insert verification failed';
 end if;
end $$;
commit;
"""
    (OUT / "publish_local_holds_abr_recovery.sql").write_text(publish_sql, encoding="utf-8")
    summary = {
        "processed": len(rows),
        "accepted": len(accepted),
        "remaining_hold": len(held),
        "reason_counts": dict(reasons),
        "target_municipalities": len(targets),
        "municipality_results": {key: dict(value) for key, value in sorted(per_municipality.items())},
        "policy": "ABR current residence-detail or parcel-detail coordinate; municipality code exact; numbered address; unique coordinate; no numeric unmatched suffix; no town/block fallback",
        "abr_sources": abr_sources,
        "abr_parcel_sources": parcel_sources,
    }
    (OUT / "local_holds_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
