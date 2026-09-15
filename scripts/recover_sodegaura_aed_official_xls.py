#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from datetime import time
from pathlib import Path

import xlrd

from build_aed_dev10_publication import build
from import_nationwide_aed import clean, mark_duplicates

INPUT = Path("data/aed_dev14/raw/12229_59831.bin")
OUT = Path("data/aed_dev17_sodegaura")
SOURCE_URL = "https://opendata.pref.chiba.lg.jp/datasets/4290"
BASELINE = 45997
BATCH_SIZE = 25


def time_text(value: object) -> str:
    if isinstance(value, float) and 0 <= value < 1:
        seconds = round(value * 86400)
        return f"{seconds // 3600:02d}:{(seconds % 3600) // 60:02d}"
    if isinstance(value, time):
        return value.strftime("%H:%M")
    return clean(value)


def main() -> None:
    book = xlrd.open_workbook(str(INPUT))
    sheet = book.sheet_by_index(0)
    if sheet.row_values(7)[0] != "#property":
        raise RuntimeError("official XLS header position changed")
    headers = [clean(value) for value in sheet.row_values(7)[1:]]
    records = []
    excluded = []
    for row_number in range(10, sheet.nrows):
        values = sheet.row_values(row_number)[1:]
        raw = dict(zip(headers, values))
        name, address = clean(raw.get("名称")), clean(raw.get("住所"))
        try:
            latitude, longitude = float(raw.get("緯度")), float(raw.get("経度"))
        except (TypeError, ValueError):
            excluded.append({"row": row_number + 1, "name": name, "reason": "missing_invalid_coordinates"})
            continue
        if not name or not address or not address.startswith("千葉県袖ケ浦市"):
            excluded.append({"row": row_number + 1, "name": name, "address": address, "reason": "missing_name_or_municipality_mismatch"})
            continue
        if not (35.25 <= latitude <= 35.55 and 139.85 <= longitude <= 140.20):
            excluded.append({"row": row_number + 1, "name": name, "address": address, "reason": "coordinate_outside_city_review_bounds"})
            continue
        identifier = clean(sheet.cell_value(row_number, 0)) or clean(raw.get("NO"))
        availability = " / ".join(value for value in [clean(raw.get("利用可能曜日")), time_text(raw.get("開始時間")),
                                                         time_text(raw.get("終了時間")), clean(raw.get("利用可能日時特記事項"))] if value)
        records.append({
            "source_key": f"municipal-open-data:sodegaura-aed:{identifier}", "facility_type": "aed",
            "name": name, "prefecture": "千葉県", "prefecture_code": "12", "municipality": "袖ケ浦市",
            "address": address, "phone": clean(raw.get("電話番号")) or None,
            "latitude": latitude, "longitude": longitude,
            "source_name": "袖ケ浦市 AED設置場所情報（自治体公式座標・まちまもMAP dev17審査済み）",
            "source_url": SOURCE_URL, "source_license": "CC BY 4.0", "source_date": None, "source_updated_at": None,
            "installation_location": clean(raw.get("設置位置")) or None, "availability": availability or None,
            "geocode_source": "自治体公式オープンデータ掲載座標", "quality_status": "rough",
            "active": False, "duplicate_candidate": False,
        })
    expected_outliers = {"袖ケ浦市今井球場", "永吉運動広場"}
    if len(records) != 64 or {row["name"] for row in excluded} != expected_outliers or any(row["reason"] != "coordinate_outside_city_review_bounds" for row in excluded):
        raise RuntimeError(f"official XLS cardinality changed: records={len(records)} excluded={excluded}")
    records, exact_removed, near_pairs = mark_duplicates(records)
    if exact_removed:
        raise RuntimeError(f"unexpected exact duplicates: {exact_removed}")
    same_facility_holds = {"municipal-open-data:sodegaura-aed:AED-54", "municipal-open-data:sodegaura-aed:AED-67"}
    for row in records:
        if row["source_key"] in same_facility_holds:
            row["duplicate_candidate"] = True
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "review.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bounds = [min(row["latitude"] for row in records) - 0.0001, max(row["latitude"] for row in records) + 0.0001,
              min(row["longitude"] for row in records) - 0.0001, max(row["longitude"] for row in records) + 0.0001]
    baseline = BASELINE
    batches = []
    for number, start in enumerate(range(0, len(records), BATCH_SIZE), 1):
        batch = records[start:start + BATCH_SIZE]
        source = {"key": f"dev17_sodegaura_{number:02d}", "prefecture": "千葉県", "municipality": "袖ケ浦市",
                  "source_url": SOURCE_URL, "review_bounds": bounds,
                  "review_reason": "自治体公式オープンデータ・公式施設座標・CC BY 4.0・利用条件・重複をdev17で確認"}
        sql = build(source, batch, baseline)
        filename = f"publish_dev17_sodegaura_{number:02d}.sql"
        (OUT / filename).write_text(sql, encoding="utf-8")
        inserted = sum(not row["duplicate_candidate"] for row in batch)
        batches.append({"file": filename, "baseline": baseline, "inserted": inserted,
                        "held": len(batch) - inserted, "expected_final": baseline + inserted,
                        "sha256": hashlib.sha256(sql.encode()).hexdigest()})
        baseline += inserted
    summary = {"municipality_code": "12229", "municipality": "袖ケ浦市", "source_rows": sheet.nrows - 10,
               "publish": baseline - BASELINE, "held": sum(row["duplicate_candidate"] for row in records),
               "coordinate_outliers_held": excluded,
               "same_facility_holds": sorted(same_facility_holds),
               "near_duplicate_pairs": near_pairs, "source_sha256": hashlib.sha256(INPUT.read_bytes()).hexdigest(),
               "baseline": BASELINE, "expected_final": baseline, "batches": batches}
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
