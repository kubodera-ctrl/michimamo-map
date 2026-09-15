#!/usr/bin/env python3
"""Recover current official AED files for known portal failures.

This step updates only the fetch evidence in data/aed_dev14/catalog_fetch.json.
It never writes to Supabase.  Sources are limited to municipality-owned pages
whose reuse terms and direct files were independently verified.
"""
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

from import_aed_open_data import read_records

ROOT = Path("data/aed_dev14")
RAW = ROOT / "raw"
CATALOG = ROOT / "catalog_fetch.json"
USER_AGENT = "machimamo-map-aed-source-audit/2026-09-16"

DIRECT = {
    "12203": {
        "prefecture": "千葉県",
        "municipality": "市川市",
        "source_url": "https://www.city.ichikawa.lg.jp/page/4744.html",
        "download_url": "https://www.city.ichikawa.lg.jp/uploaded/attachment/53056.csv",
        "license": "cc-by4_0",
        "updated_at": "2026-04-01",
        "resource_id": "ichikawa_53056",
        "format": "CSV",
    },
    "12208": {
        "prefecture": "千葉県",
        "municipality": "野田市",
        "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html",
        "download_url": "https://www.city.noda.chiba.jp/_res/projects/default_project/_page_/001/007/928/26.7aed.csv",
        "license": "cc-by4_0",
        "updated_at": "2026-07-01",
        "resource_id": "noda_26_7aed",
        "format": "CSV",
    },
}


def fetch(url: str) -> tuple[bytes, str | None]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=45) as response:
        return response.read(), response.headers.get("Content-Type")


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    rows = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_code = {str(row.get("code")): i for i, row in enumerate(rows)}

    for code, meta in DIRECT.items():
        payload, content_type = fetch(meta["download_url"])
        records = read_records(payload)
        if not records:
            raise RuntimeError(f"{code} {meta['municipality']}: parsed zero rows")
        target = RAW / f"{code}_{meta['resource_id']}.bin"
        target.write_bytes(payload)
        selected = {
            "resource_url": meta["source_url"],
            "resource_id": meta["resource_id"],
            "resource_title": meta["municipality"] + " AED設置箇所一覧",
            "download_url": meta["download_url"],
            "updated_at": meta["updated_at"],
            "format": meta["format"],
            "license": meta["license"],
        }
        evidence = {
            "code": code,
            "prefecture": meta["prefecture"],
            "municipality": meta["municipality"],
            "url": meta["source_url"],
            "fetch_status": "downloaded",
            "selected_resource": selected,
            "download_final_url": meta["download_url"],
            "content_type": content_type,
            "snapshot": str(target),
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "rows": len(records),
            "fields": list(records[0]),
            "sample": records[:2],
            "resource_profiles": [selected],
            "errors": [],
            "recovery": "official_direct_dev16",
        }
        if code in by_code:
            rows[by_code[code]] = evidence
        else:
            rows.append(evidence)
            by_code[code] = len(rows) - 1
        print(code, meta["municipality"], "downloaded", len(records), flush=True)

    CATALOG.write_text(json.dumps(rows, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
