#!/usr/bin/env python3
"""Build guarded publication SQL from dev18 Saitama strict matches."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from build_aed_dev10_publication import build
from import_aed_open_data import sql_text
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row

ROOT = Path("data/aed_dev18_saitama")
REVIEW = ROOT / "strict_geocoding"
OUT = ROOT / "strict_publish"
BASELINE = 46945


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    recovery = json.loads((ROOT / "recovery.json").read_text(encoding="utf-8"))
    baseline, reports, all_batches = BASELINE, [], []
    for target in recovery["rows"]:
        if target.get("fetch_status") != "downloaded":
            continue
        code, municipality = str(target["code"]), target["municipality"]
        accepted_path = REVIEW / f"{code}_{municipality}_accepted.json"
        if not accepted_path.exists():
            continue
        accepted = json.loads(accepted_path.read_text(encoding="utf-8"))
        source = {
            "key": f"dev18_saitama_strict_{code}", "prefecture": target["prefecture"], "municipality": municipality,
            "source_url": target["source_url"],
            "source_name": f"{municipality} AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）",
            "license_id": "PDL 1.0", "source_date": None, "source_updated_at": target.get("source_updated_at"),
            "resource_url": target["selected_resource"].get("url"),
            "review_reason": "自治体公式AED原票・PDL 1.0・住所詳細レベル8・自治体一致・重複をdev18で確認",
        }
        identity = hashlib.sha256(str(source["resource_url"]).encode()).hexdigest()[:16]
        rows = []
        for item in accepted:
            row = make_row({"name": item["name"], "address": item["address"], "prefectureName": target["prefecture"], "cityName": municipality, "telephoneNumber": item.get("phone")}, [item["longitude"], item["latitude"]], source, identity)
            if row:
                row["geocode_source"] = "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）"
                rows.append(row)
        rows, exact_removed, near_pairs = mark_duplicates(rows)
        if rows:
            lats = [row["latitude"] for row in rows]
            lons = [row["longitude"] for row in rows]
            source["review_bounds"] = [min(lats) - 0.0001, max(lats) + 0.0001, min(lons) - 0.0001, max(lons) + 0.0001]
        batches = []
        for number, start in enumerate(range(0, len(rows), 100), 1):
            batch = rows[start:start + 100]
            batch_source = {**source, "key": f"dev18_saitama_strict_{code}_{number:02d}"}
            sql = build(batch_source, batch, baseline).replace(
                "on p.facility_type='aed' and p.active and not p.duplicate_candidate",
                "on p.facility_type='aed' and p.active and not p.duplicate_candidate " + f"and p.source_url is distinct from {sql_text(source['source_url'])}",
            ).replace("source_license is distinct from 'CC BY 4.0'", "source_license is distinct from 'PDL 1.0'")
            inserted = sum(not row["duplicate_candidate"] for row in batch)
            filename = f"publish_dev18_saitama_{code}_{number:02d}.sql"
            (OUT / filename).write_text(sql, encoding="utf-8")
            entry = {"code": code, "municipality": municipality, "file": filename, "baseline": baseline, "inserted": inserted, "held": len(batch)-inserted, "expected_final": baseline+inserted, "sha256": hashlib.sha256(sql.encode()).hexdigest()}
            batches.append(entry); all_batches.append(entry); baseline += inserted
        reports.append({"code": code, "municipality": municipality, "strict_accepted": len(accepted), "review_rows": len(rows), "publish": sum(not row["duplicate_candidate"] for row in rows), "held": sum(row["duplicate_candidate"] for row in rows), "exact_removed": exact_removed, "near_duplicate_pairs": near_pairs, "batches": batches})
    summary = {"baseline": BASELINE, "expected_final": baseline, "reports": reports, "batches": all_batches}
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
