#!/usr/bin/env python3
"""Create an idempotent AED seed from licensed municipal CSV sources."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import unicodedata
import urllib.request
from pathlib import Path
from typing import Any


NAME_FIELDS = ("名称", "施設名称", "施設名", "設置施設名", "AED設置施設名称")
ADDRESS_FIELDS = ("住所", "所在地", "所在地_連結表記", "所在地連結表記")
LATITUDE_FIELDS = ("緯度", "latitude", "lat", "Y座標", "Y")
LONGITUDE_FIELDS = ("経度", "longitude", "lng", "lon", "X座標", "X")
PHONE_FIELDS = ("電話番号", "電話", "TEL", "tel")


def normalized(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).strip()


def sql_text(value: str | None) -> str:
    if value is None or value == "":
        return "null"
    return "'" + value.replace("'", "''") + "'"


def first_value(row: dict[str, str], candidates: tuple[str, ...]) -> str:
    normalized_row = {normalized(key).replace(" ", ""): normalized(value) for key, value in row.items()}
    for candidate in candidates:
        value = normalized_row.get(normalized(candidate).replace(" ", ""), "")
        if value:
            return value
    return ""


def decode_csv(payload: bytes) -> str:
    for encoding in ("utf-8-sig", "cp932"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("CSV is neither UTF-8 nor CP932")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "machimamo-map-open-data-import/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def source_key(dataset_id: str, municipality: str, name: str, address: str) -> str:
    digest = hashlib.sha256(f"{municipality}|{name}|{address}".encode()).hexdigest()[:24]
    return f"municipal-open-data:{dataset_id}:{digest}"


def parse_source(source: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    text = decode_csv(fetch(source["resource_url"]))
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, Any]] = []
    skipped = 0

    for raw in reader:
        name = first_value(raw, NAME_FIELDS)
        address = first_value(raw, ADDRESS_FIELDS)
        latitude_raw = first_value(raw, LATITUDE_FIELDS)
        longitude_raw = first_value(raw, LONGITUDE_FIELDS)
        phone = first_value(raw, PHONE_FIELDS) or None
        try:
            latitude = float(latitude_raw)
            longitude = float(longitude_raw)
        except ValueError:
            skipped += 1
            continue
        if not name or not address or not (20 <= latitude <= 46 and 122 <= longitude <= 154):
            skipped += 1
            continue
        if not address.startswith(source["prefecture"]):
            address = source["prefecture"] + address
        rows.append({
            "source_key": source_key(source["dataset_id"], source["municipality"], name, address),
            "name": name,
            "address": address,
            "phone": phone,
            "latitude": latitude,
            "longitude": longitude,
        })

    report = {
        "dataset_id": source["dataset_id"],
        "municipality": source["municipality"],
        "resource_url": source["resource_url"],
        "imported": len(rows),
        "skipped": skipped,
    }
    return rows, report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--output-report", type=Path, required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    values: list[str] = []
    reports: list[dict[str, Any]] = []
    seen: set[str] = set()

    for source in manifest["sources"]:
        print(f"fetching={source['municipality']}", flush=True)
        try:
            rows, report = parse_source(source)
        except Exception as error:
            reports.append({
                "dataset_id": source["dataset_id"],
                "municipality": source["municipality"],
                "resource_url": source["resource_url"],
                "imported": 0,
                "skipped": 0,
                "error": f"{type(error).__name__}: {error}",
            })
            print(f"failed={source['municipality']} error={type(error).__name__}", flush=True)
            continue
        reports.append(report)
        print(f"parsed={source['municipality']} rows={len(rows)}", flush=True)
        for row in rows:
            if row["source_key"] in seen:
                continue
            seen.add(row["source_key"])
            values.append("(" + ",".join([
                sql_text(row["source_key"]), sql_text("aed"), sql_text(row["name"]),
                sql_text(source["prefecture"]), sql_text(source["municipality"]),
                sql_text(row["address"]), sql_text(row["phone"]), "null",
                str(row["latitude"]), str(row["longitude"]),
                sql_text(source["source_name"]), sql_text(source["dataset_url"]),
                sql_text(source.get("source_date")), sql_text(source["license"]),
                sql_text("自治体公式CSV"), "null",
            ]) + ")")

    if not values:
        raise SystemExit("No valid AED rows were found")

    sql = (
        "begin;\n\ninsert into public.safety_spots "
        "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,"
        "latitude,longitude,source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
        + ",\n".join(values)
        + "\non conflict (source_key) do update set "
        "facility_type=excluded.facility_type,name=excluded.name,prefecture=excluded.prefecture,"
        "municipality=excluded.municipality,address=excluded.address,phone=excluded.phone,"
        "parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
        "source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,"
        "source_license=excluded.source_license,geocode_source=excluded.geocode_source,"
        "geocoded_title=excluded.geocoded_title,active=true,updated_at=now();\n\ncommit;\n"
    )
    args.output_sql.write_text(sql, encoding="utf-8")
    args.output_report.write_text(json.dumps({
        "generated_rows": len(values), "sources": reports,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"generated={len(values)} sources={len(reports)}")


if __name__ == "__main__":
    main()
