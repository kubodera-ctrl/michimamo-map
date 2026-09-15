#!/usr/bin/env python3
"""Harvest licensed municipal AED datasets from CKAN and build an idempotent seed.

The importer is intentionally conservative: unknown licences and resources whose
provenance points at prohibited/unclear nationwide maps are rejected.  It can be
run repeatedly; source_key is stable and the generated SQL uses UPSERT.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from import_aed_open_data import decode_csv, first_value, read_records, sql_text


PREFECTURES = {
    name: f"{code:02d}" for code, name in enumerate((
        "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
        "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
        "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
        "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
        "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
        "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
        "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
    ), 1)
}
ALLOWED_LICENSE_TOKENS = ("cc by", "cc-by", "creativecommons attribution", "クリエイティブ・コモンズ 表示")
DENIED_PROVENANCE = ("qqzaidanmap.jp", "aedm.jp")
NAME_FIELDS = ("名称", "施設名称", "施設名", "設置施設名", "AED設置施設名称", "AED設置施設", "AED設置場所")
ADDRESS_FIELDS = ("住所", "所在地", "所在地_連結表記", "所在地連結表記")
LAT_FIELDS = ("緯度", "latitude", "lat", "Y座標", "Y")
LNG_FIELDS = ("経度", "longitude", "lng", "lon", "X座標", "X")
PHONE_FIELDS = ("電話番号", "電話", "TEL", "tel")
LOCATION_FIELDS = ("設置場所", "設置位置", "設置箇所", "設置場所詳細")
AVAILABILITY_FIELDS = ("利用可能時間", "利用可能曜日・時間", "利用時間", "使用可能時間", "24時間利用可否")
EXTERNAL_ID_FIELDS = ("ID", "id", "施設ID", "施設番号", "AEDID")


def clean(value: Any) -> str:
    return re.sub(r"[\s\u3000]+", " ", unicodedata.normalize("NFKC", str(value or ""))).strip()


def compact(value: Any) -> str:
    return re.sub(r"[^0-9A-Za-z一-龠ぁ-んァ-ヶ]", "", clean(value)).lower()


def fetch_json(url: str) -> dict[str, Any]:
    return json.loads(fetch_bytes(url).decode("utf-8"))


def fetch_bytes(url: str) -> bytes:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "machimamo-map-aed-harvester/1.0"})
            with urllib.request.urlopen(req, timeout=45) as response:
                return response.read()
        except Exception as error:
            last_error = error
            print(f"download attempt={attempt + 1}/3 url={url} error={type(error).__name__}: {error}", file=sys.stderr, flush=True)
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"download failed after 3 attempts: {url}") from last_error


def licence_allowed(package: dict[str, Any]) -> bool:
    text = clean(" ".join(str(package.get(key) or "") for key in ("license_id", "license_title", "license_url"))).lower()
    return any(token in text for token in ALLOWED_LICENSE_TOKENS)


def has_denied_provenance(package: dict[str, Any], resource: dict[str, Any]) -> bool:
    # Catalog notes may mention a third-party map only as an alternative while
    # explicitly describing the municipality's own facility data.
    own_data = clean(" ".join(str(package.get(k) or "") for k in ("title", "name", "notes"))).lower()
    if ("管理している施設" in own_data or "市有施設" in own_data or "自治体標準オープンデータ" in own_data):
        direct = clean(" ".join(str(resource.get(k) or "") for k in ("url", "name", "description"))).lower()
        return any(domain in direct for domain in DENIED_PROVENANCE)
    text = json.dumps({"package": package, "resource": resource}, ensure_ascii=False).lower()
    return any(domain in text for domain in DENIED_PROVENANCE)


def iter_packages(catalog_url: str, query: str) -> Iterable[dict[str, Any]]:
    start = 0
    while True:
        params = urllib.parse.urlencode({"q": query, "rows": 100, "start": start})
        body = fetch_json(f"{catalog_url.rstrip('/')}/api/3/action/package_search?{params}")
        if not body.get("success"):
            raise RuntimeError(f"CKAN package_search failed: {catalog_url}")
        result = body["result"]
        packages = result.get("results", [])
        yield from packages
        start += len(packages)
        if not packages or start >= int(result.get("count", 0)):
            return


def choose_resource(package: dict[str, Any]) -> dict[str, Any] | None:
    candidates = []
    for resource in package.get("resources", []):
        url = str(resource.get("url") or "")
        fmt = clean(resource.get("format") or Path(urllib.parse.urlparse(url).path).suffix.lstrip(".")).lower()
        if fmt not in ("csv", "xlsx", "xls") or has_denied_provenance(package, resource):
            continue
        # A catalog search can match package notes while the resource is a
        # hospital/cultural-property list. Require AED evidence on the file.
        label = clean(" ".join(str(resource.get(k) or "") for k in ("name", "description", "url"))).lower()
        if not re.search(r"aed|自動体外式除細動器", label):
            continue
        candidates.append((0 if fmt == "csv" else 1, resource))
    return min(candidates, default=(9, None), key=lambda item: item[0])[1]


def prefecture_from(address: str, package: dict[str, Any]) -> tuple[str, str]:
    for name, code in PREFECTURES.items():
        if address.startswith(name):
            return name, code
    metadata = clean(" ".join(str(package.get(key) or "") for key in ("title", "notes", "organization")))
    for name, code in PREFECTURES.items():
        if name in metadata:
            return name, code
    return "", ""


def municipality_from(address: str, prefecture: str) -> str:
    tail = address[len(prefecture):] if address.startswith(prefecture) else address
    match = re.match(r"(.+?(?:市|区|町|村))", tail)
    return match.group(1) if match else ""


def haversine_m(a: dict[str, Any], b: dict[str, Any]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a["latitude"], a["longitude"], b["latitude"], b["longitude"]))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 12_742_000 * math.asin(math.sqrt(value))


def stable_key(dataset_id: str, external_id: str, name: str, address: str, lat: float, lng: float) -> str:
    identity = external_id or f"{compact(name)}|{compact(address)}|{lat:.6f}|{lng:.6f}"
    return f"municipal-catalog:{dataset_id}:{hashlib.sha256(identity.encode()).hexdigest()[:24]}"


def parse_dataset(package: dict[str, Any], resource: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    payload = fetch_bytes(resource["url"])
    records = read_records(payload)
    output, rejected = [], 0
    for raw in records:
        name = clean(first_value(raw, NAME_FIELDS))
        address = clean(first_value(raw, ADDRESS_FIELDS)).replace(" ", "")
        try:
            lat = float(clean(first_value(raw, LAT_FIELDS)))
            lng = float(clean(first_value(raw, LNG_FIELDS)))
        except ValueError:
            rejected += 1
            continue
        prefecture, prefecture_code = prefecture_from(address, package)
        municipality = municipality_from(address, prefecture)
        if not name or not address or not prefecture or not municipality or not (20 <= lat <= 46 and 122 <= lng <= 154):
            rejected += 1
            continue
        external_id = clean(first_value(raw, EXTERNAL_ID_FIELDS))
        output.append({
            "source_key": stable_key(package["id"], external_id, name, address, lat, lng),
            "source_external_id": external_id or None,
            "name": name, "prefecture": prefecture, "prefecture_code": prefecture_code,
            "municipality": municipality, "address": address,
            "phone": clean(first_value(raw, PHONE_FIELDS)) or None,
            "installation_location": clean(first_value(raw, LOCATION_FIELDS)) or None,
            "availability": clean(first_value(raw, AVAILABILITY_FIELDS)) or None,
            "latitude": lat, "longitude": lng,
        })
    return output, {"raw_rows": len(records), "valid_rows": len(output), "rejected_rows": rejected, "sha256": hashlib.sha256(payload).hexdigest()}


def mark_duplicates(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int, int]:
    exact: dict[tuple[str, str, str], dict[str, Any]] = {}
    kept, exact_removed = [], 0
    for row in rows:
        key = compact(row["name"]), compact(row["address"]), compact(row.get("installation_location"))
        if key in exact:
            exact_removed += 1
            continue
        exact[key] = row
        kept.append(row)
    candidate_count = 0
    buckets: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for row in kept:
        bucket = (round(row["latitude"] * 100), round(row["longitude"] * 100))
        nearby = [item for x in range(bucket[0] - 1, bucket[0] + 2) for y in range(bucket[1] - 1, bucket[1] + 2) for item in buckets.get((x, y), [])]
        for other in nearby:
            a, b = compact(row["name"]), compact(other["name"])
            same_facility = a == b and compact(row["address"]) == compact(other["address"])
            different_installations = compact(row.get("installation_location")) != compact(other.get("installation_location"))
            if same_facility and different_installations:
                # A current official file can list multiple AEDs in one building.
                # Distinct installation locations are evidence of separate devices,
                # even when their map coordinates are identical.
                continue
            name_related = a == b or (min(len(a), len(b)) >= 3 and (a in b or b in a))
            if name_related and haversine_m(row, other) <= 50:
                group = hashlib.sha256(f"{min(a,b)}|{min(row['source_key'], other['source_key'])}".encode()).hexdigest()[:16]
                row["duplicate_candidate"] = other["duplicate_candidate"] = True
                row["duplicate_group_key"] = other["duplicate_group_key"] = group
                candidate_count += 1
        buckets.setdefault(bucket, []).append(row)
    return kept, exact_removed, candidate_count


def build_sql(rows: list[dict[str, Any]]) -> str:
    columns = ("source_key", "facility_type", "name", "prefecture", "prefecture_code", "municipality", "address", "phone",
               "latitude", "longitude", "source_name", "source_url", "source_updated_at", "source_license", "source_external_id",
               "installation_location", "availability", "geocode_source", "duplicate_candidate", "duplicate_group_key", "quality_status")
    values = []
    for row in rows:
        package = row["_package"]
        values.append("(" + ",".join((
            sql_text(row["source_key"]), sql_text("aed"), sql_text(row["name"]), sql_text(row["prefecture"]), sql_text(row["prefecture_code"]),
            sql_text(row["municipality"]), sql_text(row["address"]), sql_text(row["phone"]), str(row["latitude"]), str(row["longitude"]),
            sql_text(clean(package.get("organization", {}).get("title")) or "自治体オープンデータ"),
            sql_text(package.get("url") or f"{package['_catalog_url'].rstrip('/')}/dataset/{package.get('name', package['id'])}"),
            sql_text(package.get("metadata_modified")), sql_text(package.get("license_title") or package.get("license_id")), sql_text(row["source_external_id"]),
            sql_text(row["installation_location"]), sql_text(row["availability"]), sql_text("自治体公式オープンデータ"),
            "true" if row.get("duplicate_candidate") else "false", sql_text(row.get("duplicate_group_key")), sql_text("rough"),
        )) + ")")
    updates = ",".join(f"{column}=excluded.{column}" for column in columns if column not in ("source_key",))
    return ("begin;\n\ninsert into public.safety_spots (" + ",".join(columns) + ") values\n" + ",\n".join(values)
            + "\non conflict (source_key) do update set " + updates + ",active=true,imported_at=now(),updated_at=now();\n\ncommit;\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", action="append", required=True, help="CKAN base URL; may be repeated")
    parser.add_argument("--query", default="AED")
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--output-report", type=Path, required=True)
    args = parser.parse_args()
    all_rows, reports, rejected_sources = [], [], []
    for catalog in args.catalog:
        print(f"catalog_start={catalog}", flush=True)
        for package in iter_packages(catalog, args.query):
            package["_catalog_url"] = catalog
            resource = choose_resource(package)
            if not licence_allowed(package) or not resource:
                rejected_sources.append({"id": package.get("id"), "title": package.get("title"), "reason": "license_or_resource"})
                continue
            try:
                started = time.monotonic()
                print(f"dataset_start={package.get('title')} url={resource['url']}", flush=True)
                rows, report = parse_dataset(package, resource)
                report["elapsed_seconds"] = round(time.monotonic() - started, 2)
                for row in rows:
                    row["_package"] = package
                all_rows.extend(rows)
                reports.append({"id": package["id"], "title": package.get("title"), "resource_url": resource["url"], **report})
                print(f"dataset_done={package.get('title')} valid={len(rows)} elapsed={report['elapsed_seconds']}s", flush=True)
            except Exception as error:
                reports.append({"id": package.get("id"), "title": package.get("title"), "resource_url": resource["url"], "elapsed_seconds": round(time.monotonic() - started, 2), "error": f"{type(error).__name__}: {error}"})
                print(f"dataset_failed={package.get('title')} error={error}", file=sys.stderr, flush=True)
    all_rows, exact_removed, duplicate_pairs = mark_duplicates(all_rows)
    if not all_rows:
        raise SystemExit("No licensed, valid AED rows were found")
    args.output_sql.write_text(build_sql(all_rows), encoding="utf-8")
    args.output_report.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(), "generated_rows": len(all_rows),
        "exact_duplicates_removed": exact_removed, "duplicate_candidate_pairs": duplicate_pairs,
        "datasets": reports, "rejected_sources": rejected_sources,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"generated={len(all_rows)} datasets={len(reports)} rejected_sources={len(rejected_sources)}")
    summary = {
        "prefectures": len({row["prefecture"] for row in all_rows}),
        "municipalities": len({(row["prefecture"], row["municipality"]) for row in all_rows}),
        "rows_by_prefecture": dict(sorted(Counter(row["prefecture"] for row in all_rows).items())),
        "exact_duplicates_removed": exact_removed,
        "duplicate_candidate_pairs": duplicate_pairs,
        "failed_datasets": [
            {"title": report.get("title"), "error": report.get("error")}
            for report in reports if report.get("error")
        ],
    }
    print("review_summary=" + json.dumps(summary, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
