#!/usr/bin/env python3
"""Build an idempotent safety_spots seed from Minato City's AED GeoJSON.

Source: Minato City Open Data (CC BY 4.0)
Dataset: https://catalog.data.metro.tokyo.lg.jp/dataset/t131032d0000000241
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


SOURCE_URL = "https://catalog.data.metro.tokyo.lg.jp/dataset/t131032d0000000241"
SOURCE_DATE = "2025-07-03"
ATTRIBUTION = "港区オープンデータ（CC BY 4.0）"


def sql_text(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def source_key(name: str, address: str) -> str:
    raw = f"東京都|港区|aed|{name}|{address}"
    return "tokyo-open-data:minato-aed:" + hashlib.sha256(raw.encode()).hexdigest()[:24]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source = json.loads(args.input.read_text(encoding="utf-8"))
    rows: list[tuple[str, str, float, float]] = []

    for feature in source.get("features", []):
        geometry = feature.get("geometry") or {}
        properties = feature.get("properties") or {}
        coordinates = geometry.get("coordinates") or []
        if geometry.get("type") != "Point" or len(coordinates) < 2:
            continue
        name = str(properties.get("施設名") or "").strip()
        address = str(properties.get("所在地") or "").strip()
        if not name or not address:
            continue
        try:
            longitude = float(coordinates[0])
            latitude = float(coordinates[1])
        except (TypeError, ValueError):
            continue
        if not (35.4 <= latitude <= 36.0 and 139.4 <= longitude <= 140.0):
            continue
        rows.append((name, address, latitude, longitude))

    values = []
    for name, address, latitude, longitude in rows:
        values.append(
            "(" + ",".join([
                sql_text(source_key(name, address)),
                sql_text("aed"),
                sql_text(name),
                sql_text("東京都"),
                sql_text("港区"),
                sql_text(address),
                "null",
                sql_text(ATTRIBUTION),
                str(latitude),
                str(longitude),
                sql_text(SOURCE_URL),
                sql_text(SOURCE_DATE),
                "null",
            ]) + ")"
        )

    sql = (
        "begin;\n\n"
        "insert into public.safety_spots "
        "(source_key, facility_type, name, prefecture, municipality, address, phone, parent_name, "
        "latitude, longitude, source_url, source_date, geocoded_title) values\n"
        + ",\n".join(values)
        + "\non conflict (source_key) do update set\n"
        "facility_type=excluded.facility_type,name=excluded.name,prefecture=excluded.prefecture,"
        "municipality=excluded.municipality,address=excluded.address,phone=excluded.phone,"
        "parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
        "source_url=excluded.source_url,source_date=excluded.source_date,"
        "geocoded_title=excluded.geocoded_title,active=true,updated_at=now();\n\ncommit;\n"
    )
    args.output.write_text(sql, encoding="utf-8")
    print(f"generated={len(rows)} output={args.output}")


if __name__ == "__main__":
    main()
