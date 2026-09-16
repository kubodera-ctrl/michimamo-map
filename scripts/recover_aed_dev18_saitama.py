#!/usr/bin/env python3
"""Recover the newest official Saitama AED resources left by dev17.

This is acquisition-only.  It never publishes rows.  Old resources are kept as
evidence but marked stale so a later publication step cannot select them by
accident.
"""
from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import date
from pathlib import Path

from import_aed_open_data import read_records


INVENTORY = Path("data/aed_dev14/dev16_remaining_inventory.json")
OUT = Path("data/aed_dev18_saitama")
RAW = OUT / "raw"
USER_AGENT = "machimamo-map-aed-source-audit/2026-09-16"
STALE_BEFORE = "2023-01-01"


def fetch(url: str) -> tuple[bytes, str, str | None]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read(), response.geturl(), response.headers.get("Content-Type")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))["rows"]
    targets = [row for row in inventory if row.get("prefecture") == "埼玉県"]
    results: list[dict[str, object]] = []

    for target in targets:
        code = str(target["code"])
        dataset_id = str(target["source_url"]).rstrip("/").rsplit("/", 1)[-1]
        api_url = f"https://opendata.pref.saitama.lg.jp/ckan_api/package_show?id={dataset_id}"
        result: dict[str, object] = {**target, "api_url": api_url}
        try:
            api_payload, _, _ = fetch(api_url)
            package = json.loads(api_payload)["result"]
            resources = [
                resource for resource in package.get("resources", [])
                if str(resource.get("format") or "").lower() in {"csv", "xls", "xlsx"}
            ]
            if not resources:
                raise RuntimeError("no tabular resource")
            selected = max(
                resources,
                key=lambda resource: (
                    str(resource.get("last_modified") or resource.get("created") or ""),
                    str(resource.get("format") or "").lower() == "csv",
                ),
            )
            payload, final_url, content_type = fetch(str(selected["url"]))
            records = read_records(payload)
            if not records:
                raise RuntimeError("parsed zero rows")
            resource_id = str(selected["id"])
            snapshot = RAW / f"{code}_{resource_id}.bin"
            snapshot.write_bytes(payload)
            updated_at = str(selected.get("last_modified") or selected.get("created") or "")[:10]
            stale = not updated_at or updated_at < STALE_BEFORE
            result.update(
                {
                    "fetch_status": "downloaded_stale" if stale else "downloaded",
                    "dataset_title": package.get("title"),
                    "dataset_modified_at": str(package.get("metadata_modified") or "")[:10] or None,
                    "selected_resource": selected,
                    "download_final_url": final_url,
                    "content_type": content_type,
                    "snapshot": str(snapshot),
                    "bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                    "rows": len(records),
                    "fields": list(records[0]),
                    "sample": records[:2],
                    "source_updated_at": updated_at or None,
                    "source_license": selected.get("resource_license_id") or package.get("license_id"),
                    "publication_eligible_by_age": not stale,
                }
            )
            print(code, target["municipality"], result["fetch_status"], len(records), flush=True)
        except Exception as error:
            result.update(
                {
                    "fetch_status": "failed",
                    "error": type(error).__name__ + ": " + str(error),
                    "publication_eligible_by_age": False,
                }
            )
            print(code, target["municipality"], "failed", type(error).__name__, flush=True)
        results.append(result)

    summary = {
        "generated_at": date.today().isoformat(),
        "policy": f"Resources older than {STALE_BEFORE} are evidence only; publication requires strict coordinate or address review.",
        "targets": len(results),
        "downloaded_current": sum(row["fetch_status"] == "downloaded" for row in results),
        "downloaded_stale": sum(row["fetch_status"] == "downloaded_stale" for row in results),
        "failed": sum(row["fetch_status"] == "failed" for row in results),
        "rows": results,
    }
    (OUT / "recovery.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
