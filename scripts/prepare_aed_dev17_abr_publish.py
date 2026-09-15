#!/usr/bin/env python3
"""Prepare guarded publication SQL from dev17 strict ABR review results."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from build_aed_dev10_publication import build
from geocode_aed_dev17_abr_strict import TARGETS, load_records
from import_aed_open_data import sql_text
from import_nationwide_aed import clean, mark_duplicates
from prepare_bodik_aed_review import make_row

REVIEW = Path("data/aed_dev17_geolonia_strict")
OUT = Path("data/aed_dev17_abr_publish")
BASELINE = 46774


def availability(raw: dict, code: str) -> str | None:
    if code == "12228":
        values = (raw.get("利用可能な曜日"), raw.get("利用可能な時間"))
    else:
        values = (
            raw.get("利用可能曜日"),
            raw.get("開始時間"),
            raw.get("終了時間"),
            raw.get("利用可能日時特記事項"),
        )
    joined = " / ".join(clean(value) for value in values if clean(value))
    return joined or None


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    baseline = BASELINE
    reports = []
    all_batches = []
    for code, target in TARGETS.items():
        municipality = target["municipality"]
        accepted_path = REVIEW / f"{code}_{municipality}_accepted.json"
        if not accepted_path.exists():
            raise SystemExit(f"missing strict review result: {accepted_path}")
        accepted = json.loads(accepted_path.read_text(encoding="utf-8"))
        raw_by_row = {row_number: raw for row_number, raw in enumerate(load_records(target), 2)}
        source = {
            "key": f"dev17_abr_{code}",
            "prefecture": target["prefecture"],
            "municipality": municipality,
            "source_url": target["source_url"],
            "source_name": f"{municipality} AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev17審査済み）",
            "license_id": "CC BY 4.0",
            "source_date": target.get("data_as_of"),
            "source_updated_at": target["source_updated_at"],
            "resource_url": target["source_url"],
            "review_reason": "自治体公式AED原票・CC BY 4.0・住所詳細レベル・自治体コード・市域・重複をdev17で確認",
        }
        identity = hashlib.sha256(target["source_url"].encode()).hexdigest()[:16]
        rows = []
        mapping_errors = []
        for item in accepted:
            raw = raw_by_row.get(int(item["row"]))
            if raw is None:
                mapping_errors.append({"row": item["row"], "reason": "raw_row_not_found"})
                continue
            location = clean(raw.get("設置位置") or raw.get("設置場所"))
            mapped = {
                "name": item["name"],
                "address": item["address"],
                "prefectureName": target["prefecture"],
                "cityName": municipality,
                "telephoneNumber": item.get("phone"),
                "placeOfInstallation": location,
                "openingHoursRemarks": availability(raw, code),
            }
            row = make_row(
                mapped,
                [item["longitude"], item["latitude"]],
                source,
                identity,
            )
            if row:
                row["geocode_source"] = "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）"
                rows.append(row)
            else:
                mapping_errors.append({"row": item["row"], "reason": "publication_row_validation_failed"})
        rows, exact_removed, near_pairs = mark_duplicates(rows)
        if rows:
            lats = [row["latitude"] for row in rows]
            lons = [row["longitude"] for row in rows]
            source["review_bounds"] = [min(lats) - 0.0001, max(lats) + 0.0001, min(lons) - 0.0001, max(lons) + 0.0001]
        else:
            source["review_bounds"] = list(target["bounds"])

        (OUT / f"{code}_{municipality}_review.json").write_text(
            json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        batches = []
        for number, start in enumerate(range(0, len(rows), 100), 1):
            batch = rows[start : start + 100]
            batch_source = {**source, "key": f"dev17_abr_{code}_{number:02d}"}
            sql = build(batch_source, batch, baseline).replace(
                "on p.facility_type='aed' and p.active and not p.duplicate_candidate",
                "on p.facility_type='aed' and p.active and not p.duplicate_candidate "
                f"and p.source_url is distinct from {sql_text(source['source_url'])}",
            )
            inserted = sum(not row["duplicate_candidate"] for row in batch)
            filename = f"publish_dev17_abr_{code}_{number:02d}.sql"
            (OUT / filename).write_text(sql, encoding="utf-8")
            entry = {
                "file": filename,
                "baseline": baseline,
                "inserted": inserted,
                "held": len(batch) - inserted,
                "expected_final": baseline + inserted,
                "sha256": hashlib.sha256(sql.encode()).hexdigest(),
            }
            batches.append(entry)
            all_batches.append(entry)
            baseline += inserted
        reports.append(
            {
                "code": code,
                "municipality": municipality,
                "strict_accepted": len(accepted),
                "review_rows": len(rows),
                "publish": sum(not row["duplicate_candidate"] for row in rows),
                "held": sum(row["duplicate_candidate"] for row in rows),
                "exact_removed": exact_removed,
                "near_duplicate_pairs": near_pairs,
                "mapping_errors": mapping_errors,
                "batches": batches,
            }
        )
    summary = {
        "baseline": BASELINE,
        "expected_final": baseline,
        "reports": reports,
        "batches": all_batches,
    }
    (OUT / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"baseline": BASELINE, "expected_final": baseline, "reports": reports}, ensure_ascii=False))


if __name__ == "__main__":
    main()
