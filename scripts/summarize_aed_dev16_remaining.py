#!/usr/bin/env python3
"""Build a compact dev16 inventory for the AED municipalities still needing review.

This script is deliberately read-only with respect to Supabase.  It classifies
catalog resources so the publication pass can separate official-coordinate
rows, address-only rows, parser/resource failures, and license holds without
re-running any dev14 publication SQL.
"""
from __future__ import annotations

import json
from pathlib import Path

from import_aed_open_data import LATITUDE_FIELDS, LONGITUDE_FIELDS, read_records, first_value

ROOT = Path("data/aed_dev14")
OUT = ROOT / "dev16_remaining_inventory.json"
SUPPORTED_LICENSES = {"pdl", "cc-by4_0", "cc-by2_1"}
KNOWN_LOW_PRECISION_HOLDS = {"12239", "27218"}  # 大網白里市 / 大東市


def has_valid_coordinates(records: list[dict]) -> tuple[int, int]:
    valid = 0
    missing = 0
    for row in records:
        try:
            lat = float(first_value(row, LATITUDE_FIELDS))
            lon = float(first_value(row, LONGITUDE_FIELDS))
            if 20 <= lat <= 46 and 122 <= lon <= 154:
                valid += 1
            else:
                missing += 1
        except (TypeError, ValueError):
            missing += 1
    return valid, missing


def main() -> None:
    catalog = json.loads((ROOT / "catalog_fetch.json").read_text(encoding="utf-8"))
    published_sources = json.loads((ROOT / "coordinate_sources.json").read_text(encoding="utf-8"))
    published_codes = {source["key"].split("_")[1] for source in published_sources}

    rows = []
    for item in catalog:
        code = str(item.get("code", ""))
        selected = item.get("selected_resource") or {}
        status = item.get("fetch_status")
        license_id = selected.get("license")
        entry = {
            "code": code,
            "prefecture": item.get("prefecture"),
            "municipality": item.get("municipality"),
            "fetch_status": status,
            "license": license_id,
            "parsed_rows": item.get("parsed_rows", 0),
            "resource_id": selected.get("resource_id"),
            "format": selected.get("format"),
            "source_url": item.get("url"),
            "download_url": selected.get("download_url"),
        }
        if code in published_codes:
            entry["decision"] = "already_published_dev14"
        elif code in KNOWN_LOW_PRECISION_HOLDS:
            entry["decision"] = "hold_known_low_precision_geocode"
        elif status != "downloaded":
            entry["decision"] = "needs_resource_recovery"
        elif license_id not in SUPPORTED_LICENSES:
            entry["decision"] = "hold_license_unverified"
        else:
            try:
                records = read_records(Path(item["snapshot"]).read_bytes())
                valid, missing = has_valid_coordinates(records)
                entry["valid_coordinate_rows"] = valid
                entry["missing_coordinate_rows"] = missing
                if valid:
                    entry["decision"] = "official_coordinates_review"
                else:
                    entry["decision"] = "address_only_strict_geocode_required"
            except Exception as exc:
                entry["decision"] = "needs_parser_review"
                entry["parse_error"] = str(exc)
        rows.append(entry)

    remaining = [r for r in rows if r["decision"] != "already_published_dev14"]
    counts: dict[str, int] = {}
    for row in remaining:
        counts[row["decision"]] = counts.get(row["decision"], 0) + 1
    payload = {
        "policy": "Only municipality-published exact coordinates or strict high-precision geocodes may be published. Representative town/block points stay held.",
        "catalog_entries": len(rows),
        "already_published_dev14": len(rows) - len(remaining),
        "remaining_catalog_entries": len(remaining),
        "decision_counts": counts,
        "rows": remaining,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: payload[k] for k in ("catalog_entries", "already_published_dev14", "remaining_catalog_entries", "decision_counts")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
