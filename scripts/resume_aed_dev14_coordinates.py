"""Rebuild uncommitted dev14 batches after a guarded partial production run."""
import hashlib
import json
import re
from pathlib import Path

from build_aed_dev10_publication import build
from import_aed_open_data import sql_text


ROOT = Path("data/aed_dev14")
COMPLETED = {"dev14_11201_6471_1", "dev14_11203_2043_1", "dev14_11203_2043_2"}
START_BASELINE = 43909


def compact(value):
    return re.sub(r"[^0-9A-Za-z一-龠ぁ-んァ-ヶ]", "", str(value or "")).lower()


def conflicts(row, other):
    a, b = compact(row["name"]), compact(other["name"])
    same = a == b and re.sub(r"[\s　-]", "", row["address"]) == re.sub(r"[\s　-]", "", other["address"])
    near = abs(row["latitude"] - other["latitude"]) < 0.001 and abs(row["longitude"] - other["longitude"]) < 0.002
    related = a == b or (min(len(a), len(b)) >= 3 and (a in b or b in a))
    return same or (near and related)


def main():
    sources = {row["key"]: row for row in json.loads((ROOT / "coordinate_sources.json").read_text())}
    original = json.loads((ROOT / "coordinate_batch_index.json").read_text())
    public_sim = []
    remaining = []
    for batch in original:
        source_key = batch["key"].rsplit("_", 1)[0]
        number = int(batch["key"].rsplit("_", 1)[1])
        rows = json.loads((ROOT / f"{source_key}_review.json").read_text())[(number - 1) * 150 : number * 150]
        if batch["key"] in COMPLETED:
            public_sim.extend(row for row in rows if not row["duplicate_candidate"])
        else:
            remaining.append((batch, source_key, rows))
    baseline = START_BASELINE
    output = []
    boundary_holds = []
    for old, source_key, rows in remaining:
        for row in rows:
            if not row["duplicate_candidate"] and any(conflicts(row, prior) for prior in public_sim):
                row["duplicate_candidate"] = True
                boundary_holds.append(row["source_key"])
        source = sources[source_key]
        sql = build({**source, "key": old["key"], "review_reason": "自治体公式オープンデータ・公式座標・利用条件・重複を確認"}, rows, baseline).replace(
            "source_license is distinct from 'CC BY 4.0'",
            "source_license is distinct from " + sql_text(source["license_id"]),
        )
        inserted = sum(not row["duplicate_candidate"] for row in rows)
        filename = "resume_" + old["file"]
        (ROOT / filename).write_text(sql)
        output.append({"key": old["key"], "file": filename, "baseline": baseline, "inserted": inserted, "held": len(rows) - inserted, "sha256": hashlib.sha256(sql.encode()).hexdigest()})
        public_sim.extend(row for row in rows if not row["duplicate_candidate"])
        baseline += inserted
    (ROOT / "coordinate_batch_index_resume.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "coordinate_boundary_holds.json").write_text(json.dumps(boundary_holds, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"batches": len(output), "boundary_holds": len(boundary_holds), "inserted": baseline - START_BASELINE, "expected": baseline}))


if __name__ == "__main__":
    main()
