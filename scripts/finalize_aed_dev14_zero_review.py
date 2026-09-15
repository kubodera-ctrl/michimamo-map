"""Record the no-publish decision for zero-listing cities without precise coordinates."""
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path("data/aed_dev14")


def main() -> None:
    inputs = {(row["dataset"], row["row"]): row for row in json.loads((ROOT / "geocode_inputs.json").read_text())}
    results = [json.loads(line) for line in (ROOT / "geocode_results.ndjson").read_text().splitlines() if line]
    grouped = defaultdict(list)
    for result in results:
        source = inputs[(result["dataset"], result["row"])]
        point = result.get("point") or {}
        grouped[source["code"]].append({**source, "geocode": result, "decision": "hold", "reason": "not_address_coordinate_level_8" if point.get("level") != 8 else "review_required"})
    report = []
    for code, rows in grouped.items():
        report.append(
            {
                "code": code,
                "municipality": rows[0]["municipality"],
                "official_rows": len(rows),
                "geocode_point_levels": dict(Counter(str((row["geocode"].get("point") or {}).get("level")) for row in rows)),
                "publish": 0,
                "held": len(rows),
                "decision": "公開保留（施設単位の公式座標または位置情報レベル8が必要）",
                "source_url": rows[0]["source_url"],
                "resource_url": rows[0]["resource_url"],
                "source_license": rows[0]["license_id"],
                "source_sha256": rows[0]["source_sha256"],
            }
        )
    (ROOT / "zero_recovery_review.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
