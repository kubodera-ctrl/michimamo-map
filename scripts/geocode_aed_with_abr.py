#!/usr/bin/env python3
"""Geocode address-only municipal AED CSV data with Digital Agency ABR data.

The output uses residence coordinates when available and falls back to the
representative coordinate of the matching block. Rows outside the requested
municipality and rows without a safe match are excluded.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import unicodedata
import zipfile
from collections import Counter
from pathlib import Path
from typing import Iterator


NAME_FIELDS = ("名称", "施設名称", "施設名", "設置施設名", "AED設置施設名称")
ADDRESS_FIELDS = ("住所", "所在地", "所在地_連結表記", "所在地連結表記")
PHONE_FIELDS = ("電話番号", "電話", "TEL", "tel")
MUNICIPALITY_FIELDS = ("市区町村名", "地方公共団体名", "所在地_市区町村", "所在地市区町村")
KANJI_DIGITS = {"〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
                "六": 6, "七": 7, "八": 8, "九": 9}


def clean(value: object) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).strip()


def first(row: dict[str, str], fields: tuple[str, ...]) -> str:
    values = {clean(k).replace(" ", ""): clean(v) for k, v in row.items()}
    for field in fields:
        if value := values.get(field, ""):
            return value
    return ""


def japanese_number(value: str) -> str:
    value = value.replace("丁目", "")
    if not value:
        return ""
    if value.isdigit():
        return str(int(value))
    if "十" in value:
        left, right = value.split("十", 1)
        return str((KANJI_DIGITS.get(left, 1) if left else 1) * 10
                   + (KANJI_DIGITS.get(right, 0) if right else 0))
    return str(KANJI_DIGITS.get(value, value))


def normalize_address(value: str, prefecture: str, municipality: str) -> str:
    value = clean(value).replace(prefecture, "").replace(municipality, "")
    value = re.sub(r"[‐‑‒–—―ー−ｰ－]", "-", value)
    value = re.sub(r"\s+", "", value)
    value = re.sub(r"([0-9]+)丁目", r"\1-", value)
    value = re.sub(r"([0-9]+)番地?", r"\1-", value)
    value = re.sub(r"([0-9]+)号", r"\1", value)
    value = re.sub(r"([^0-9])-([0-9]+)-", r"\1\2-", value)
    return re.sub(r"-+", "-", value).strip("-")


def zip_rows(path: Path) -> Iterator[dict[str, str]]:
    with zipfile.ZipFile(path) as archive:
        with archive.open(archive.namelist()[0]) as raw:
            with io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as text:
                yield from csv.DictReader(text)


def address_key(row: dict[str, str], include_residence: bool) -> str:
    town = clean(row.get("oaza_cho")) + clean(row.get("koaza"))
    chome = japanese_number(clean(row.get("chome")))
    parts = [clean(row.get("blk_num"))]
    if include_residence:
        parts += [clean(row.get("rsdt_num")), clean(row.get("rsdt_num2"))]
    parts = [str(int(value)) for value in parts if value.isdigit()]
    return town + (chome + "-" if chome else "") + "-".join(parts)


def coordinate_map(path: Path, municipality_code: str, residence: bool) -> dict[tuple[str, ...], tuple[float, float]]:
    result = {}
    for row in zip_rows(path):
        if row["lg_code"] != municipality_code or not row["rep_lat"] or not row["rep_lon"]:
            continue
        fields = ["machiaza_id", "blk_id"] + (["rsdt_id", "rsdt2_id"] if residence else [])
        result[tuple(row[field] for field in fields)] = (float(row["rep_lat"]), float(row["rep_lon"]))
    return result


def build_index(data_path: Path, pos_path: Path, municipality_code: str,
                prefecture: str, municipality: str, residence: bool) -> dict[str, tuple[float, float]]:
    positions = coordinate_map(pos_path, municipality_code, residence)
    index = {}
    for row in zip_rows(data_path):
        if row["lg_code"] != municipality_code:
            continue
        fields = ["machiaza_id", "blk_id"] + (["rsdt_id", "rsdt2_id"] if residence else [])
        coordinate = positions.get(tuple(row[field] for field in fields))
        if coordinate:
            key = normalize_address(address_key(row, residence), prefecture, municipality)
            if key:
                index.setdefault(key, coordinate)
    return index


def sql_text(value: str | None) -> str:
    return "null" if not value else "'" + value.replace("'", "''") + "'"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-csv", type=Path, required=True)
    parser.add_argument("--municipality-code", required=True)
    parser.add_argument("--municipality", required=True)
    parser.add_argument("--prefecture", default="東京都")
    parser.add_argument("--dataset-id", required=True)
    parser.add_argument("--dataset-url", required=True)
    parser.add_argument("--source-name", required=True)
    parser.add_argument("--license", default="CC BY 4.0")
    parser.add_argument("--source-date")
    parser.add_argument("--abr-block-data", type=Path, required=True)
    parser.add_argument("--abr-block-pos", type=Path, required=True)
    parser.add_argument("--abr-residence-data", type=Path, required=True)
    parser.add_argument("--abr-residence-pos", type=Path, required=True)
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--output-report", type=Path, required=True)
    args = parser.parse_args()

    residence = build_index(args.abr_residence_data, args.abr_residence_pos,
                            args.municipality_code, args.prefecture, args.municipality, True)
    block = build_index(args.abr_block_data, args.abr_block_pos,
                        args.municipality_code, args.prefecture, args.municipality, False)
    residence_items = sorted(residence.items(), key=lambda item: len(item[0]), reverse=True)
    block_items = sorted(block.items(), key=lambda item: len(item[0]), reverse=True)

    with args.input_csv.open(encoding="utf-8-sig", newline="") as handle:
        source_rows = list(csv.DictReader(handle))
    generated = []
    misses = []
    stats: Counter[str] = Counter()
    seen = set()
    for row in source_rows:
        name, address = first(row, NAME_FIELDS), first(row, ADDRESS_FIELDS)
        row_municipality = first(row, MUNICIPALITY_FIELDS)
        if row_municipality and row_municipality != args.municipality:
            stats["outside_municipality"] += 1
            continue
        query = normalize_address(address, args.prefecture, args.municipality)
        match = next(((coordinate, "ABR住居座標", key) for key, coordinate in residence_items
                      if query == key or query.startswith(key)), None)
        if not match:
            match = next(((coordinate, "ABR街区代表点", key) for key, coordinate in block_items
                          if query == key or query.startswith(key + "-")), None)
        if not name or not address or not match:
            stats["unmatched"] += 1
            misses.append({"name": name, "address": address})
            continue
        coordinate, method, matched_key = match
        full_address = address if address.startswith(args.prefecture) else args.prefecture + address
        digest = hashlib.sha256(f"{args.municipality}|{name}|{full_address}".encode()).hexdigest()[:24]
        source_key = f"municipal-open-data:{args.dataset_id}:{digest}"
        if source_key in seen:
            stats["duplicate"] += 1
            continue
        seen.add(source_key)
        stats[method] += 1
        generated.append((source_key, name, full_address, first(row, PHONE_FIELDS) or None,
                          coordinate[0], coordinate[1], method, matched_key))

    values = []
    for source_key, name, address, phone, latitude, longitude, method, matched_key in generated:
        values.append("(" + ",".join([
            sql_text(source_key), sql_text("aed"), sql_text(name), sql_text(args.prefecture),
            sql_text(args.municipality), sql_text(address), sql_text(phone), "null",
            str(latitude), str(longitude), sql_text(args.source_name), sql_text(args.dataset_url),
            sql_text(args.source_date), sql_text(args.license), sql_text(method), sql_text(matched_key),
        ]) + ")")
    if not values:
        raise SystemExit("No safely geocoded rows")
    sql = (
        "begin;\n\ninsert into public.safety_spots "
        "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,"
        "source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
        + ",\n".join(values)
        + "\non conflict (source_key) do update set facility_type=excluded.facility_type,name=excluded.name,"
        "prefecture=excluded.prefecture,municipality=excluded.municipality,address=excluded.address,"
        "phone=excluded.phone,parent_name=excluded.parent_name,latitude=excluded.latitude,"
        "longitude=excluded.longitude,source_name=excluded.source_name,source_url=excluded.source_url,"
        "source_date=excluded.source_date,source_license=excluded.source_license,"
        "geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,"
        "active=true,updated_at=now();\n\ncommit;\n"
    )
    args.output_sql.write_text(sql, encoding="utf-8")
    args.output_report.write_text(json.dumps({
        "municipality": args.municipality,
        "source_rows": len(source_rows),
        "generated_rows": len(generated),
        "match_counts": stats,
        "unmatched": misses,
        "abr_dataset": "アドレス・ベース・レジストリ（デジタル庁）",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"source={len(source_rows)} generated={len(generated)} matches={dict(stats)}")


if __name__ == "__main__":
    main()
