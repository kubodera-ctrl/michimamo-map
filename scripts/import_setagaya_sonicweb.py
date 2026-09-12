#!/usr/bin/env python3
"""Create Setagaya AED seed SQL from the official Setagaya iMap API."""
from __future__ import annotations

import argparse
import hashlib
import json
import unicodedata
import urllib.request
from pathlib import Path
from typing import Any


def norm(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).strip()


def get_json(url: str) -> tuple[list[dict[str, Any]], str]:
    request = urllib.request.Request(
        url, headers={"User-Agent": "machimamo-map-setagaya-aed-import/1.0"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read()
    data = json.loads(body)
    if not isinstance(data, list):
        raise ValueError(f"Expected a JSON array from {url}")
    return data, hashlib.sha256(body).hexdigest()


def sql_text(value: str | None) -> str:
    return "null" if not value else "'" + value.replace("'", "''") + "'"


def full_address(prefecture: str, municipality: str, address: str) -> str:
    if address.startswith(prefecture):
        return address
    if address.startswith(municipality):
        return prefecture + address
    return prefecture + municipality + address


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--output-report", type=Path, required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    source = manifest["source"]
    records: dict[tuple[str, str], dict[str, Any]] = {}
    layer_reports = []

    # Read the 24-hour layer first. Its facilities also occur in the main AED
    # layer, so the name/address key below deliberately collapses both views.
    for layer in sorted(source["layers"], key=lambda item: not item.get("is_24h", False)):
        rows, content_hash = get_json(layer["url"])
        layer_reports.append(
            {
                "layer_id": layer["layer_id"],
                "is_24h": bool(layer.get("is_24h")),
                "url": layer["url"],
                "feature_count": len(rows),
                "sha256": content_hash,
            }
        )
        for row in rows:
            name = norm(row.get("dispname"))
            attributes = row.get("attributes") or []
            address = norm(attributes[0] if len(attributes) > 0 else "")
            phone = norm(attributes[1] if len(attributes) > 1 else "") or None
            available_time = norm(attributes[2] if len(attributes) > 2 else "") or None
            coordinates = (row.get("geom") or {}).get("coordinates") or []
            if not name or not address or len(coordinates) < 2:
                raise ValueError(f"Missing required AED data: {row!r}")
            longitude, latitude = float(coordinates[0]), float(coordinates[1])
            if not (35.0 <= latitude <= 36.0 and 139.0 <= longitude <= 140.0):
                raise ValueError(f"Coordinate outside Tokyo: {row!r}")
            address = full_address(source["prefecture"], source["municipality"], address)
            key = (name, address)
            records.setdefault(
                key,
                {
                    "feature_id": norm(row.get("featureid")),
                    "name": name,
                    "address": address,
                    "phone": phone,
                    "available_time": available_time,
                    "latitude": latitude,
                    "longitude": longitude,
                    "is_24h": bool(layer.get("is_24h")),
                },
            )

    values = []
    for (name, address), row in sorted(records.items()):
        digest = hashlib.sha256(f"{name}|{address}".encode()).hexdigest()[:24]
        source_key = f"municipal-sonicweb:setagaya-aed:{digest}"
        values.append(
            "("
            + ",".join(
                [
                    sql_text(source_key),
                    sql_text("aed"),
                    sql_text(name),
                    sql_text(source["prefecture"]),
                    sql_text(source["municipality"]),
                    sql_text(address),
                    sql_text(row["phone"]),
                    "null",
                    str(row["latitude"]),
                    str(row["longitude"]),
                    sql_text(source["source_name"]),
                    sql_text(source["dataset_url"]),
                    sql_text(source["source_date"]),
                    sql_text(source["license"]),
                    sql_text("自治体公式地図"),
                    "null",
                ]
            )
            + ")"
        )

    raw_count = sum(layer["feature_count"] for layer in layer_reports)
    report = {
        "dataset_id": source["dataset_id"],
        "municipality": source["municipality"],
        "source_name": source["source_name"],
        "source_date": source["source_date"],
        "license": source["license"],
        "raw_features": raw_count,
        "duplicate_features": raw_count - len(values),
        "generated_rows": len(values),
        "layers": layer_reports,
        "deduplication_key": "NFKC-normalized facility name and full address",
        "stored_fields": ["name", "address", "phone", "latitude", "longitude"],
        "available_time_captured_in_report_only": True,
        "24_hour_facilities": sum(1 for row in records.values() if row["is_24h"]),
    }
    if len(values) != source["expected_unique_count"]:
        raise ValueError(
            f"Expected {source['expected_unique_count']} unique rows, got {len(values)}"
        )

    sql = (
        "begin;\n\ninsert into public.safety_spots "
        "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,"
        "source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
        + ",\n".join(values)
        + "\non conflict (source_key) do update set facility_type=excluded.facility_type,name=excluded.name,"
        "prefecture=excluded.prefecture,municipality=excluded.municipality,address=excluded.address,"
        "phone=excluded.phone,parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
        "source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,"
        "source_license=excluded.source_license,geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,"
        "active=true,updated_at=now();\n\ncommit;\n"
    )
    args.output_sql.write_text(sql, encoding="utf-8")
    args.output_report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"{source['municipality']} raw={raw_count} duplicates={raw_count - len(values)} "
        f"generated={len(values)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
