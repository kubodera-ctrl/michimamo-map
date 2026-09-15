#!/usr/bin/env python3
"""Recover and prepare guarded SQL for Okayama City's official AED GIS CSV."""
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

from build_aed_dev10_publication import build
from import_aed_open_data import read_records, sql_text
from import_nationwide_aed import clean, mark_duplicates
from prepare_bodik_aed_review import make_row

OUT = Path("data/aed_dev17_okayama")
CSV_URL = "https://www.gis.pref.okayama.jp/pref-okayama/pref-okayama/opendatafile/map_1506/CSV/opendata_1575.csv"
SOURCE_URL = "https://www.gis.pref.okayama.jp/okayamacity/okayamacity/Content/pages/opendata/index.html"
DETAIL_URL = "https://www.gis.pref.okayama.jp/pref-okayama/OpenDataDetail?lid=1575&mids=1506"
BASELINE = 46080
DISTINCT_REVIEWED_PAIR = {
    "北長瀬駅南口自転車等駐車場",
    "北長瀬駅",
}


def fetch() -> bytes:
    request = urllib.request.Request(CSV_URL, headers={"User-Agent": "machimamo-map-aed-recovery/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    payload = fetch()
    records = read_records(payload)
    source = {
        "key": "dev17_33100_okayama_gis_1575",
        "prefecture": "岡山県",
        "municipality": "岡山市",
        "source_url": SOURCE_URL,
        "source_name": "岡山市 AED設置施設（自治体公式GIS座標・まちまもMAP dev17審査済み）",
        "license_id": "CC BY 4.0",
        "source_date": None,
        "source_updated_at": "2026-09-15",
        "resource_url": CSV_URL,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "review_bounds": [34.45, 34.95, 133.70, 134.20],
        "review_reason": "岡山市公式GISのAED専用CSV・施設座標・CC BY 4.0・市域・重複をdev17で確認",
    }
    rows = []
    excluded = []
    for row_number, raw in enumerate(records, 2):
        name = clean(raw.get("名称"))
        address = clean(raw.get("所在地"))
        if address and not address.startswith("岡山市"):
            address = "岡山市" + address
        try:
            latitude = float(raw.get("緯度"))
            longitude = float(raw.get("経度"))
        except (TypeError, ValueError):
            excluded.append({"row": row_number, "name": name, "address": address, "reason": "invalid_coordinates"})
            continue
        if not name or not address:
            excluded.append({"row": row_number, "name": name, "address": address, "reason": "missing_identity"})
            continue
        if not address.startswith("岡山市") or not (34.45 <= latitude <= 34.95 and 133.70 <= longitude <= 134.20):
            excluded.append({"row": row_number, "name": name, "address": address, "reason": "municipality_or_bounds"})
            continue
        mapped = {
            "name": name,
            "address": "岡山県" + address,
            "prefectureName": "岡山県",
            "cityName": "岡山市",
            "telephoneNumber": raw.get("電話番号"),
            "placeOfInstallation": raw.get("AED設置場所"),
            "openingHoursRemarks": raw.get("備考"),
        }
        row = make_row(mapped, [longitude, latitude], source, "okayama-gis-1575")
        if row:
            row["geocode_source"] = "岡山市公式GIS掲載の施設座標"
            rows.append(row)

    rows, exact_removed, near_pairs = mark_duplicates(rows)
    candidate_rows = [row for row in rows if row["duplicate_candidate"]]
    if candidate_rows and {row["name"] for row in candidate_rows} == DISTINCT_REVIEWED_PAIR:
        for row in candidate_rows:
            row["duplicate_candidate"] = False
            row.pop("duplicate_group_key", None)
    elif candidate_rows:
        # Unreviewed near pairs remain in stage as holds.
        pass

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "official_gis_1575.csv").write_bytes(payload)
    (OUT / "review.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    batches = []
    baseline = BASELINE
    for number, start in enumerate(range(0, len(rows), 100), 1):
        batch = rows[start : start + 100]
        batch_source = {**source, "key": f"dev17_okayama_{number:02d}"}
        sql = build(batch_source, batch, baseline).replace(
            "on p.facility_type='aed' and p.active and not p.duplicate_candidate",
            "on p.facility_type='aed' and p.active and not p.duplicate_candidate "
            f"and p.source_url is distinct from {sql_text(SOURCE_URL)}",
        )
        inserted = sum(not row["duplicate_candidate"] for row in batch)
        filename = f"publish_dev17_okayama_{number:02d}.sql"
        (OUT / filename).write_text(sql, encoding="utf-8")
        batches.append(
            {
                "file": filename,
                "baseline": baseline,
                "inserted": inserted,
                "held": len(batch) - inserted,
                "expected_final": baseline + inserted,
                "sha256": hashlib.sha256(sql.encode()).hexdigest(),
            }
        )
        baseline += inserted
    summary = {
        "municipality_code": "33100",
        "municipality": "岡山市",
        "source_rows": len(records),
        "publish": sum(not row["duplicate_candidate"] for row in rows),
        "held": sum(row["duplicate_candidate"] for row in rows),
        "excluded": excluded,
        "exact_removed": exact_removed,
        "near_duplicate_pairs": near_pairs,
        "near_pair_adjudication": "北長瀬駅と北長瀬駅南口自転車等駐車場は名称・住所・用途が異なる別施設として公開",
        "license": "CC BY 4.0",
        "source_updated_at": "2026-09-15",
        "source_sha256": source["sha256"],
        "detail_url": DETAIL_URL,
        "baseline": BASELINE,
        "expected_final": baseline,
        "batches": batches,
    }
    (OUT / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"source_rows": len(records), "publish": summary["publish"], "held": summary["held"], "expected_final": baseline}, ensure_ascii=False))


if __name__ == "__main__":
    main()
