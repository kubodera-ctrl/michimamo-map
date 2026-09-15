#!/usr/bin/env python3
"""Rebuild reviewed dev16 priority AED publication SQL in small guarded batches."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from build_aed_dev10_publication import build
from import_aed_open_data import sql_text

ROOT = Path("data/aed_dev14")
OUT = Path("data/aed_dev16_small")
BASELINE = 45381
BATCH_SIZE = 20
SOURCES = [
    ("12203", "ichikawa_53056", "市川市"),
    ("12208", "noda_26_7aed", "野田市"),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    baseline = BASELINE
    batches = []
    for code, resource_id, municipality in SOURCES:
        review_path = ROOT / f"dev16_{code}_{resource_id}_review.json"
        rows = json.loads(review_path.read_text(encoding="utf-8"))
        if not rows:
            raise RuntimeError(f"empty review: {municipality}")
        lats = [float(r["latitude"]) for r in rows]
        lngs = [float(r["longitude"]) for r in rows]
        first = rows[0]
        source = {
            "key": f"dev16_{code}_{resource_id}",
            "prefecture": first["prefecture"],
            "municipality": first["municipality"],
            "source_url": first["source_url"],
            "license_id": first["source_license"],
            "review_bounds": [min(lats)-0.0001, max(lats)+0.0001, min(lngs)-0.0001, max(lngs)+0.0001],
            "review_reason": "自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認",
        }
        for number, start in enumerate(range(0, len(rows), BATCH_SIZE), 1):
            batch = rows[start:start+BATCH_SIZE]
            batch_source = {**source, "key": f"{source['key']}_small_{number:02d}"}
            sql = build(batch_source, batch, baseline).replace(
                "source_license is distinct from 'CC BY 4.0'",
                "source_license is distinct from " + sql_text(source["license_id"]),
            )
            inserted = sum(not r["duplicate_candidate"] for r in batch)
            held = len(batch)-inserted
            filename = f"publish_{batch_source['key']}.sql"
            (OUT / filename).write_text(sql, encoding="utf-8")
            batches.append({
                "key": batch_source["key"], "file": filename, "municipality": municipality,
                "baseline": baseline, "inserted": inserted, "held": held,
                "sha256": hashlib.sha256(sql.encode()).hexdigest(),
            })
            baseline += inserted
    payload = {"baseline": BASELINE, "batch_size": BATCH_SIZE, "expected_final": baseline, "batches": batches}
    (OUT / "index.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"batches":len(batches),"expected_final":baseline}, ensure_ascii=False))


if __name__ == "__main__":
    main()
