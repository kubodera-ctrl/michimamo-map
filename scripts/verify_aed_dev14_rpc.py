"""Verify dev14 rows through the same anonymous map RPC used by the application."""
import concurrent.futures
import json
import re
import urllib.request
from pathlib import Path


ROOT = Path("data/aed_dev14")


def main():
    app = Path("index.html").read_text()
    url = re.search(r"const SUPABASE_URL = '([^']+)'", app)[1]
    key = re.search(r"const SUPABASE_KEY = '([^']+)'", app)[1]
    boundary_holds = set(json.loads((ROOT / "coordinate_boundary_holds.json").read_text()))
    outlier_holds = {row["source_key"] for row in json.loads((ROOT / "coordinate_outlier_holds.json").read_text())}
    sources = json.loads((ROOT / "coordinate_sources.json").read_text())

    def check(source):
        rows = json.loads((ROOT / f"{source['key']}_review.json").read_text())
        active = [row for row in rows if not row["duplicate_candidate"] and row["source_key"] not in boundary_holds | outlier_holds]
        expected = len(active)
        south, north = min(row["latitude"] for row in active) - 0.0001, max(row["latitude"] for row in active) + 0.0001
        west, east = min(row["longitude"] for row in active) - 0.0001, max(row["longitude"] for row in active) + 0.0001
        body = json.dumps({"p_west": west, "p_south": south, "p_east": east, "p_north": north, "p_types": ["aed"], "p_max_rows": 1500}).encode()
        request = urllib.request.Request(url + "/rest/v1/rpc/get_safety_spots", data=body, headers={"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=30) as response:
            visible = json.load(response)
        matches = [row for row in visible if row["source_url"] == source["source_url"]]
        assert len(visible) < 1500, "RPC result truncated"
        assert len(matches) == expected, (source["key"], len(matches), expected)
        assert all(row["source_license"] == source["license_id"] and row["municipality"] == source["municipality"] for row in matches)
        return {"key": source["key"], "municipality": source["municipality"], "count": len(matches), "expected": expected, "license": source["license_id"], "status": "passed"}

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(check, sources))
    (ROOT / "anon_rpc_results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"sources": len(results), "rows": sum(row["count"] for row in results), "status": "passed"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
