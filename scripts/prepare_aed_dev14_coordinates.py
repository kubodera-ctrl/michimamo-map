"""Review dev14 rows that carry municipality-published coordinates and build guarded SQL."""
import hashlib
import json
from collections import Counter
from pathlib import Path

from build_aed_dev10_publication import build
from import_aed_open_data import (
    ADDRESS_FIELDS,
    LATITUDE_FIELDS,
    LONGITUDE_FIELDS,
    NAME_FIELDS,
    PHONE_FIELDS,
    first_value,
    read_records,
    sql_text,
)
from import_nationwide_aed import clean, mark_duplicates
from prepare_bodik_aed_review import make_row, municipality_from_address


ROOT = Path("data/aed_dev14")
BASELINE = 43598
LICENSES = {"pdl": "PDL 1.0", "cc-by4_0": "CC BY 4.0", "cc-by2_1": "CC BY 2.1 Japan"}


def main() -> None:
    catalog = json.loads((ROOT / "catalog_fetch.json").read_text())
    all_rows = []
    reports = []
    sources = []
    source_rows = {}
    for item in catalog:
        selected = item.get("selected_resource") or {}
        license_id = LICENSES.get(selected.get("license"))
        if item.get("fetch_status") != "downloaded" or not license_id:
            continue
        try:
            records = read_records(Path(item["snapshot"]).read_bytes())
        except Exception as error:
            reports.append({"code": item["code"], "municipality": item["municipality"], "reason": "parse_failed", "error": str(error)})
            continue
        prefecture = item["prefecture"]
        municipality = item["municipality"]
        key = f"dev14_{item['code']}_{selected['resource_id']}"
        source = {
            "key": key,
            "prefecture": prefecture,
            "municipality": municipality,
            "source_url": item["url"],
            "source_name": municipality + " AED設置情報（自治体公式座標・まちまもMAP審査済み）",
            "license_id": license_id,
            "source_date": None,
            "source_updated_at": selected.get("updated_at"),
            "resource_url": selected.get("download_url"),
            "sha256": item["sha256"],
        }
        accepted = []
        excluded = []
        for row_number, raw in enumerate(records, 2):
            name = first_value(raw, NAME_FIELDS)
            address = first_value(raw, ADDRESS_FIELDS)
            if address and not address.startswith(prefecture):
                address = prefecture + (address if address.startswith(municipality) else municipality + address)
            location = first_value(raw, ("設置位置", "設置場所_詳細", "設置場所", "方書"))
            remarks = " / ".join(clean(raw.get(k)) for k in ("利用可能日時特記事項", "日時備考", "備考") if clean(raw.get(k)))
            reason = None
            try:
                latitude = float(first_value(raw, LATITUDE_FIELDS))
                longitude = float(first_value(raw, LONGITUDE_FIELDS))
            except (TypeError, ValueError):
                latitude = longitude = 0
                reason = "missing_invalid_coordinates"
            if not name or not address:
                reason = reason or "missing_name_address"
            elif municipality_from_address(prefecture, address) != municipality:
                reason = reason or "municipality_mismatch"
            elif clean(raw.get("外部利用不可")) not in ("", "0", "なし", "無"):
                reason = reason or "external_use_restricted"
            elif any(word in name + location + remarks for word in ("車両", "消防車", "救急車", "移動用", "貸出", "撤去", "廃止", "閉鎖", "使用不可")):
                reason = reason or "availability_requires_review"
            elif not (20 <= latitude <= 46 and 122 <= longitude <= 154):
                reason = reason or "outside_japan"
            if reason:
                excluded.append({"row": row_number, "name": name, "address": address, "reason": reason})
                continue
            mapped = {
                "name": name,
                "address": address,
                "prefectureName": prefecture,
                "cityName": municipality,
                "placeOfInstallation": location,
                "telephoneNumber": first_value(raw, PHONE_FIELDS),
                "openingDays": first_value(raw, ("利用可能曜日", "利用可能日")),
                "startTime": raw.get("開始時間"),
                "endTime": raw.get("終了時間"),
                "openingHoursRemarks": remarks,
            }
            identity = hashlib.sha256(str(selected["download_url"]).encode()).hexdigest()[:16]
            row = make_row(mapped, [longitude, latitude], source, identity)
            if row:
                accepted.append(row)
        if not accepted:
            reports.append({"key": key, "code": item["code"], "municipality": municipality, "raw_rows": len(records), "publish": 0, "excluded": excluded})
            continue
        accepted, exact_removed, near_pairs = mark_duplicates(accepted)
        lats = [row["latitude"] for row in accepted]
        lngs = [row["longitude"] for row in accepted]
        source["review_bounds"] = [min(lats) - 0.0001, max(lats) + 0.0001, min(lngs) - 0.0001, max(lngs) + 0.0001]
        reports.append({
            "key": key,
            "code": item["code"],
            "municipality": municipality,
            "raw_rows": len(records),
            "eligible": len(accepted),
            "publish": sum(not row["duplicate_candidate"] for row in accepted),
            "held": sum(row["duplicate_candidate"] for row in accepted),
            "exact_removed": exact_removed,
            "near_duplicate_pairs": near_pairs,
            "excluded": excluded,
        })
        sources.append(source)
        source_rows[key] = accepted
        all_rows.extend(accepted)
        (ROOT / f"{key}_review.json").write_text(json.dumps(accepted, ensure_ascii=False, indent=2, default=str) + "\n")

    baseline = BASELINE
    batches = []
    for source in sources:
        rows = source_rows[source["key"]]
        for number, start in enumerate(range(0, len(rows), 150), 1):
            batch = rows[start : start + 150]
            batch_source = {**source, "key": f"{source['key']}_{number}", "review_reason": "自治体公式オープンデータ・公式座標・利用条件・重複を確認"}
            sql = build(batch_source, batch, baseline).replace(
                "source_license is distinct from 'CC BY 4.0'",
                "source_license is distinct from " + sql_text(source["license_id"]),
            )
            inserted = sum(not row["duplicate_candidate"] for row in batch)
            filename = f"publish_{batch_source['key']}.sql"
            (ROOT / filename).write_text(sql)
            batches.append({"key": batch_source["key"], "file": filename, "baseline": baseline, "inserted": inserted, "held": len(batch) - inserted, "sha256": hashlib.sha256(sql.encode()).hexdigest()})
            baseline += inserted
    for filename, payload in (("coordinate_sources.json", sources), ("coordinate_review_reports.json", reports), ("coordinate_batch_index.json", batches)):
        (ROOT / filename).write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str) + "\n")
    print(json.dumps({"sources": len(sources), "rows": len(all_rows), "publish": baseline - BASELINE, "expected": baseline, "report_reasons": dict(Counter(r.get("reason", "reviewed") for r in reports))}, ensure_ascii=False))


if __name__ == "__main__":
    main()
