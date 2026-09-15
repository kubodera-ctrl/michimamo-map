#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import io
import json
import urllib.request
from pathlib import Path

from build_aed_dev10_publication import build
from import_nationwide_aed import clean, mark_duplicates

OUT = Path("data/aed_dev17_misaki")
DOWNLOAD_URL = "https://kumegun-misaki.dataeye.jp/resource_download/5502"
SOURCE_URL = "https://www.okayama-opendata.jp/datasets/781"
BASELINE = 46059
UA = "machimamo-map-aed-source-audit/2026-09-16"


def main() -> None:
    request = urllib.request.Request(DOWNLOAD_URL, headers={"User-Agent": UA, "Accept": "text/csv,*/*"})
    with urllib.request.urlopen(request, timeout=45) as response:
        payload = response.read()
    text = payload.decode("cp932")
    source_rows = list(csv.DictReader(io.StringIO(text)))
    records = []
    for index, raw in enumerate(source_rows, 1):
        name, address = clean(raw.get("施設名")), clean(raw.get("住所"))
        latitude, longitude = float(clean(raw.get("y"))), float(clean(raw.get("x")))
        if not name or not address.startswith("岡山県久米郡美咲町") or not (34.8 <= latitude <= 35.2 and 133.6 <= longitude <= 134.3):
            raise RuntimeError(f"invalid official row {index}: {raw}")
        digest = hashlib.sha256(f"{name}|{address}".encode()).hexdigest()[:24]
        records.append({
            "source_key": f"municipal-open-data:misaki-aed-5502:{digest}", "facility_type": "aed",
            "name": name, "prefecture": "岡山県", "prefecture_code": "33", "municipality": "美咲町",
            "address": address, "phone": clean(raw.get("連絡先")) or None,
            "latitude": latitude, "longitude": longitude,
            "source_name": "美咲町 AED設置場所（自治体公式座標・まちまもMAP dev17審査済み）",
            "source_url": SOURCE_URL, "source_license": "PDL 1.0", "source_date": None,
            "source_updated_at": "2021-03-16", "installation_location": clean(raw.get("設置場所")) or None,
            "availability": clean(raw.get("備考")) or None, "geocode_source": "自治体公式オープンデータ掲載座標",
            "quality_status": "rough", "active": False, "duplicate_candidate": False,
        })
    if len(records) != 21:
        raise RuntimeError(f"official CSV cardinality changed: {len(records)}")
    records, exact_removed, near_pairs = mark_duplicates(records)
    if exact_removed:
        raise RuntimeError(f"unexpected exact duplicates: {exact_removed}")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "official_5502.csv").write_bytes(payload)
    (OUT / "review.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    bounds = [min(row["latitude"] for row in records) - 0.0001, max(row["latitude"] for row in records) + 0.0001,
              min(row["longitude"] for row in records) - 0.0001, max(row["longitude"] for row in records) + 0.0001]
    source = {"key": "dev17_misaki_01", "prefecture": "岡山県", "municipality": "美咲町",
              "source_url": SOURCE_URL, "review_bounds": bounds,
              "review_reason": "自治体公式AED専用CSV・公式施設座標・PDL 1.0・重複をdev17で確認"}
    sql = build(source, records, BASELINE).replace("source_license is distinct from 'CC BY 4.0'", "source_license is distinct from 'PDL 1.0'")
    filename = "publish_dev17_misaki_01.sql"
    (OUT / filename).write_text(sql, encoding="utf-8")
    inserted = sum(not row["duplicate_candidate"] for row in records)
    summary = {"municipality_code": "33666", "municipality": "美咲町", "source_rows": len(source_rows),
               "publish": inserted, "held": len(records) - inserted, "near_duplicate_pairs": near_pairs,
               "source_updated_at": "2021-03-16", "source_sha256": hashlib.sha256(payload).hexdigest(),
               "baseline": BASELINE, "expected_final": BASELINE + inserted,
               "batches": [{"file": filename, "baseline": BASELINE, "inserted": inserted,
                            "held": len(records) - inserted, "expected_final": BASELINE + inserted,
                            "sha256": hashlib.sha256(sql.encode()).hexdigest()}]}
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
