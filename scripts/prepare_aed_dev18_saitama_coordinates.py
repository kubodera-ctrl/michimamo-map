#!/usr/bin/env python3
"""Review current Saitama official-coordinate AED files and build guarded SQL."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from build_aed_dev10_publication import build
from import_aed_open_data import ADDRESS_FIELDS, LATITUDE_FIELDS, LONGITUDE_FIELDS, NAME_FIELDS, PHONE_FIELDS, first_value, read_records, sql_text
from import_nationwide_aed import clean, mark_duplicates
from prepare_bodik_aed_review import make_row, municipality_from_address

ROOT = Path("data/aed_dev18_saitama")
BASELINE = 46945


def main() -> None:
    recovery = json.loads((ROOT / "recovery.json").read_text(encoding="utf-8"))
    reports, batches = [], []
    baseline = BASELINE
    for item in recovery["rows"]:
        if item.get("fetch_status") != "downloaded":
            continue
        records = read_records(Path(item["snapshot"]).read_bytes())
        # Address-only sources are routed to strict geocoding, never this path.
        has_coordinate_fields = any(first_value(row, LATITUDE_FIELDS) and first_value(row, LONGITUDE_FIELDS) for row in records)
        if not has_coordinate_fields:
            reports.append({"code": item["code"], "municipality": item["municipality"], "status": "address_only_strict_geocode_required", "raw_rows": len(records)})
            continue
        code, municipality, prefecture = str(item["code"]), item["municipality"], item["prefecture"]
        selected = item["selected_resource"]
        key = f"dev18_saitama_{code}_{selected['id']}"
        source = {
            "key": key, "prefecture": prefecture, "municipality": municipality,
            "source_url": item["source_url"],
            "source_name": municipality + " AED設置情報（自治体公式座標・まちまもMAP dev18審査済み）",
            "license_id": "PDL 1.0", "source_date": None,
            "source_updated_at": item.get("source_updated_at"),
            "resource_url": selected.get("url"), "sha256": item["sha256"],
        }
        accepted, excluded = [], []
        for row_number, raw in enumerate(records, 2):
            name, address = first_value(raw, NAME_FIELDS), first_value(raw, ADDRESS_FIELDS)
            if address and not address.startswith(prefecture):
                address = prefecture + (address if address.startswith(municipality) else municipality + address)
            location = first_value(raw, ("設置位置", "設置場所_詳細", "設置場所", "方書"))
            remarks = " / ".join(clean(raw.get(k)) for k in ("利用可能日時特記事項", "日時備考", "備考") if clean(raw.get(k)))
            reason = None
            try:
                latitude, longitude = float(first_value(raw, LATITUDE_FIELDS)), float(first_value(raw, LONGITUDE_FIELDS))
            except (TypeError, ValueError):
                latitude = longitude = 0.0
                reason = "missing_invalid_coordinates"
            if not name or not address:
                reason = reason or "missing_name_address"
            elif municipality_from_address(prefecture, address) != municipality:
                reason = reason or "municipality_mismatch"
            elif clean(raw.get("外部利用不可")) not in ("", "0", "なし", "無"):
                reason = reason or "external_use_restricted"
            elif any(word in name + location + remarks for word in ("車両", "消防車", "救急車", "移動用", "貸出", "撤去", "廃止", "閉鎖", "使用不可")):
                reason = reason or "availability_requires_review"
            elif not (34.7 <= latitude <= 36.4 and 138.6 <= longitude <= 140.0):
                reason = reason or "outside_saitama_review_bounds"
            if reason:
                excluded.append({"row": row_number, "name": name, "address": address, "reason": reason})
                continue
            mapped = {
                "name": name, "address": address, "prefectureName": prefecture, "cityName": municipality,
                "placeOfInstallation": location, "telephoneNumber": first_value(raw, PHONE_FIELDS),
                "openingDays": first_value(raw, ("利用可能曜日", "利用可能日")),
                "startTime": raw.get("開始時間"), "endTime": raw.get("終了時間"), "openingHoursRemarks": remarks,
            }
            identity = hashlib.sha256(str(selected["url"]).encode()).hexdigest()[:16]
            mapped_row = make_row(mapped, [longitude, latitude], source, identity)
            if mapped_row:
                accepted.append(mapped_row)
        accepted, exact_removed, near_pairs = mark_duplicates(accepted)
        report = {"key": key, "code": code, "municipality": municipality, "raw_rows": len(records), "eligible": len(accepted), "publish": sum(not r["duplicate_candidate"] for r in accepted), "held": sum(r["duplicate_candidate"] for r in accepted), "exact_removed": exact_removed, "near_duplicate_pairs": near_pairs, "excluded": excluded}
        reports.append(report)
        (ROOT / f"{key}_review.json").write_text(json.dumps(accepted, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
        for number, start in enumerate(range(0, len(accepted), 100), 1):
            batch = accepted[start:start + 100]
            batch_source = {**source, "key": f"{key}_{number:02d}"}
            sql = build(batch_source, batch, baseline).replace("source_license is distinct from 'CC BY 4.0'", "source_license is distinct from " + sql_text(source["license_id"]))
            inserted = sum(not row["duplicate_candidate"] for row in batch)
            filename = f"publish_{batch_source['key']}.sql"
            (ROOT / filename).write_text(sql, encoding="utf-8")
            batches.append({"key": batch_source["key"], "file": filename, "baseline": baseline, "inserted": inserted, "held": len(batch)-inserted, "sha256": hashlib.sha256(sql.encode()).hexdigest()})
            baseline += inserted
    (ROOT / "coordinate_review_reports.json").write_text(json.dumps(reports, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    (ROOT / "coordinate_batch_index.json").write_text(json.dumps(batches, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"baseline": BASELINE, "batches": len(batches), "expected_final": baseline, "reports": reports}, ensure_ascii=False))


if __name__ == "__main__":
    main()
