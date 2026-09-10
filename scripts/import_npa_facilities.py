#!/usr/bin/env python3
"""Build idempotent safety_spots seed SQL from the National Police Agency CSVs.

The NPA files contain addresses but no coordinates. Coordinates are supplemented
with the Geospatial Information Authority of Japan address-search service. The
original address, source URL, source date and geocoding title are retained so
that imported rows remain auditable.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

GSI_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch"
NPA_SOURCE_URL = "https://www.npa.go.jp/about/overview/index.html/"
SOURCE_DATE = "2025-04-01"


def read_rows(police_csv: Path, koban_csv: Path, prefecture: str) -> list[dict]:
    facilities: list[dict] = []
    with police_csv.open(encoding="cp932", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("都道府県") != prefecture:
                continue
            facilities.append({
                "facility_type": "police_station",
                "name": row["名称"].strip(),
                "prefecture": prefecture,
                "municipality": row["市区町村"].strip(),
                "address": f"{prefecture}{row['全体表記'].strip()}",
                "phone": row.get("電話番号", "").strip() or None,
                "parent_name": row.get("警察本部名称", "").strip() or None,
            })

    with koban_csv.open(encoding="cp932", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("都道府県名") != prefecture:
                continue
            kind = row.get("交番・駐在所の別", "").strip()
            if kind not in {"交番", "駐在所"}:
                continue
            facilities.append({
                "facility_type": "koban" if kind == "交番" else "chuzaisho",
                "name": row["名称"].strip(),
                "prefecture": prefecture,
                "municipality": row["市区町村"].strip(),
                "address": f"{prefecture}{row['全体表記'].strip()}",
                "phone": row.get("電話番号", "").strip() or None,
                "parent_name": row.get("警察署名称", "").strip() or None,
            })
    return facilities


def geocode(address: str, attempts: int = 3) -> dict | None:
    url = f"{GSI_URL}?{urllib.parse.urlencode({'q': address})}"
    request = urllib.request.Request(url, headers={"User-Agent": "machimamo-map-data-import/1.0"})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                data = json.load(response)
            if data:
                lng, lat = data[0]["geometry"]["coordinates"]
                return {
                    "lat": float(lat),
                    "lng": float(lng),
                    "geocoded_title": data[0].get("properties", {}).get("title"),
                }
            return None
        except Exception:
            if attempt + 1 == attempts:
                return None
            time.sleep(0.6 * (attempt + 1))
    return None


def sql_text(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def source_key(row: dict) -> str:
    raw = "|".join((row["prefecture"], row["facility_type"], row["name"], row["address"]))
    return "npa:R07:" + hashlib.sha256(raw.encode()).hexdigest()[:24]


def write_sql(rows: list[dict], output: Path) -> None:
    values = []
    for row in rows:
        values.append("(" + ",".join([
            sql_text(source_key(row)), sql_text(row["facility_type"]), sql_text(row["name"]),
            sql_text(row["prefecture"]), sql_text(row["municipality"]), sql_text(row["address"]),
            sql_text(row["phone"]), sql_text(row["parent_name"]), str(row["lat"]), str(row["lng"]),
            sql_text(NPA_SOURCE_URL), sql_text(SOURCE_DATE), sql_text(row.get("geocoded_title")),
        ]) + ")")

    output.write_text(
        "begin;\n\ninsert into public.safety_spots "
        "(source_key, facility_type, name, prefecture, municipality, address, phone, parent_name, "
        "latitude, longitude, source_url, source_date, geocoded_title) values\n" +
        ",\n".join(values) +
        "\non conflict (source_key) do update set\n"
        "facility_type=excluded.facility_type,name=excluded.name,prefecture=excluded.prefecture,"
        "municipality=excluded.municipality,address=excluded.address,phone=excluded.phone,"
        "parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
        "source_url=excluded.source_url,source_date=excluded.source_date,"
        "geocoded_title=excluded.geocoded_title,active=true,updated_at=now();\n\ncommit;\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--police-csv", type=Path, required=True)
    parser.add_argument("--koban-csv", type=Path, required=True)
    parser.add_argument("--prefecture", default="東京都")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--unmatched", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, default=0, help="Process at most this many uncached addresses")
    parser.add_argument("--retry-missing", action="store_true", help="Retry cached addresses with no result")
    args = parser.parse_args()

    rows = read_rows(args.police_csv, args.koban_csv, args.prefecture)
    cache = json.loads(args.cache.read_text(encoding="utf-8")) if args.cache.exists() else {}
    if args.retry_missing:
        cache = {address: point for address, point in cache.items() if point is not None}
    pending = sorted({row["address"] for row in rows if row["address"] not in cache})
    if args.limit > 0:
        pending = pending[:args.limit]
    completed = 0
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 12))) as executor:
        futures = {executor.submit(geocode, address): address for address in pending}
        for future in as_completed(futures):
            address = futures[future]
            cache[address] = future.result()
            completed += 1
            if completed % 5 == 0:
                args.cache.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"geocoded {completed}/{len(pending)}", flush=True)
    args.cache.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    matched, unmatched = [], []
    for row in rows:
        point = cache.get(row["address"])
        if point:
            matched.append({**row, **point})
        else:
            unmatched.append(row)
    write_sql(matched, args.output)
    args.unmatched.write_text(json.dumps(unmatched, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"matched={len(matched)} unmatched={len(unmatched)} total={len(rows)}")


if __name__ == "__main__":
    main()
