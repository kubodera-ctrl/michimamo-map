#!/usr/bin/env python3
"""Create an idempotent AED seed from licensed municipal CSV sources."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import unicodedata
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin
from pathlib import Path
from typing import Any

import openpyxl


NAME_FIELDS = (
    "名称", "施設名称", "施設名", "設置施設名", "AED設置施設名称", "AED設置施設", "設置場所",
)
ADDRESS_FIELDS = ("住所", "所在地", "所在地_連結表記", "所在地連結表記")
LATITUDE_FIELDS = ("緯度", "latitude", "lat", "Y座標", "Y")
LONGITUDE_FIELDS = ("経度", "longitude", "lng", "lon", "X座標", "X")
PHONE_FIELDS = ("電話番号", "電話", "TEL", "tel")
MUNICIPALITY_FIELDS = ("市区町村名", "地方公共団体名", "所在地_市区町村", "所在地市区町村")


def normalized(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "")).strip()


def sql_text(value: str | None) -> str:
    if value is None or value == "":
        return "null"
    return "'" + value.replace("'", "''") + "'"


def first_value(row: dict[str, str], candidates: tuple[str, ...]) -> str:
    normalized_row = {normalized(key).replace(" ", ""): normalized(value) for key, value in row.items()}
    for candidate in candidates:
        value = normalized_row.get(normalized(candidate).replace(" ", ""), "")
        if value:
            return value
    return ""


def decode_csv(payload: bytes) -> str:
    if payload.startswith((b'\xff\xfe', b'\xfe\xff')):
        return payload.decode('utf-16')
    for encoding in ("utf-8-sig", "cp932"):
        try:
            return payload.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("CSV is neither UTF-8 nor CP932")


def read_records(payload: bytes) -> list[dict[str, Any]]:
    """Read municipal open data even when an XLSX is served from a .csv URL."""
    if payload.startswith(b"PK\x03\x04"):
        workbook = openpyxl.load_workbook(io.BytesIO(payload), data_only=True, read_only=True)
        for sheet in workbook.worksheets:
            values = sheet.iter_rows(values_only=True)
            headers = next(values, None)
            if not headers or not any(headers):
                continue
            keys = [normalized(value) for value in headers]
            return [dict(zip(keys, row)) for row in values if any(value is not None for value in row)]
        return []
    return list(csv.DictReader(io.StringIO(decode_csv(payload))))



class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        self._href = dict(attrs).get("href")
        self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href is not None:
            self.links.append((self._href, normalized("".join(self._text))))
            self._href = None
            self._text = []


def resolve_resource_url(source: dict[str, Any]) -> str:
    direct = source.get("resource_url")
    if direct:
        return direct
    landing_url = source.get("landing_url") or source.get("dataset_url")
    needle = normalized(source.get("link_text_contains"))
    if not landing_url or not needle:
        raise ValueError("resource_url or landing_url + link_text_contains is required")
    html = decode_csv(fetch(landing_url))
    parser = LinkCollector()
    parser.feed(html)
    for href, text in parser.links:
        if needle in text:
            return urljoin(landing_url, href)
    raise ValueError(f"No link containing {needle!r} found on {landing_url}")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "machimamo-map-open-data-import/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def source_key(dataset_id: str, municipality: str, name: str, address: str, detail: str = "") -> str:
    identity = f"{municipality}|{name}|{address}"
    if detail:
        identity += f"|{detail}"
    digest = hashlib.sha256(identity.encode()).hexdigest()[:24]
    return f"municipal-open-data:{dataset_id}:{digest}"


def parse_source(source: dict[str, Any], input_dir: Path | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    resource_url = resolve_resource_url(source)
    payload = (input_dir / (source['dataset_id'] + '.csv')).read_bytes() if input_dir else fetch(resource_url)
    reader = read_records(payload)
    rows: list[dict[str, Any]] = []
    skipped = 0
    restricted = 0
    outside_municipality = 0

    for raw in reader:
        restriction = first_value(raw, ('外部利用不可',))
        if restriction and restriction.lower() not in ('0', 'false', 'なし', '無'):
            restricted += 1
            continue
        name = first_value(raw, NAME_FIELDS)
        address = first_value(raw, ADDRESS_FIELDS)
        row_municipality = first_value(raw, MUNICIPALITY_FIELDS)
        # A ward may also publish its holiday homes in other prefectures.
        # Keep this batch limited to the source ward. Standard open-data CSVs may
        # split the municipality from an address that starts at the town name.
        address_has_municipality = (
            address.startswith(source['municipality'])
            or address.startswith(source['prefecture'] + source['municipality'])
        )
        allow_relative_address = bool(source.get("allow_relative_address"))
        if (
            not address_has_municipality
            and row_municipality != source['municipality']
            and not (allow_relative_address and not row_municipality)
        ):
            outside_municipality += 1
            continue
        if not address_has_municipality:
            address = source['municipality'] + address
        latitude_raw = first_value(raw, LATITUDE_FIELDS)
        longitude_raw = first_value(raw, LONGITUDE_FIELDS)
        phone = first_value(raw, PHONE_FIELDS) or None
        key_detail = first_value(raw, tuple(source.get("source_key_detail_fields", ())))
        try:
            latitude = float(latitude_raw)
            longitude = float(longitude_raw)
        except ValueError:
            skipped += 1
            continue
        if not name or not address or not (20 <= latitude <= 46 and 122 <= longitude <= 154):
            skipped += 1
            continue
        if not address.startswith(source["prefecture"]):
            address = source["prefecture"] + address
        rows.append({
            "source_key": source_key(
                source["dataset_id"], source["municipality"], name, address, key_detail,
            ),
            "name": name,
            "address": address,
            "phone": phone,
            "latitude": latitude,
            "longitude": longitude,
        })

    report = {
        "dataset_id": source["dataset_id"],
        "municipality": source["municipality"],
        "dataset_url": source["dataset_url"],
        "resource_url": resource_url,
        "source_name": source["source_name"],
        "source_date": source.get("source_date"),
        "source_date_note": source.get("source_date_note"),
        "license": source["license"],
        "quality_notes": source.get("quality_notes", []),
        "imported": len(rows),
        "skipped": skipped,
        "restricted": restricted,
        "outside_municipality": outside_municipality,
        "sha256": hashlib.sha256(payload).hexdigest(),
    }
    if not rows and reader:
        report["detected_columns"] = list(reader[0].keys())
        report["sample_row"] = {str(k): normalized(v)[:120] for k, v in reader[0].items()}
        print(f"diagnostic={source['municipality']} columns={report['detected_columns']} sample={report['sample_row']}", flush=True)
    return rows, report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-sql", type=Path, required=True)
    parser.add_argument("--output-report", type=Path, required=True)
    parser.add_argument("--input-dir", type=Path, help="Use downloaded source files named <dataset_id>.csv")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    values: list[str] = []
    reports: list[dict[str, Any]] = []
    seen: set[str] = set()

    for source in manifest["sources"]:
        print(f"fetching={source['municipality']}", flush=True)
        try:
            rows, report = parse_source(source, args.input_dir)
        except Exception as error:
            reports.append({
                "dataset_id": source["dataset_id"],
                "municipality": source["municipality"],
                "resource_url": source.get("resource_url") or source.get("landing_url") or source.get("dataset_url"),
                "imported": 0,
                "skipped": 0,
                "error": f"{type(error).__name__}: {error}",
            })
            print(f"failed={source['municipality']} error={type(error).__name__}", flush=True)
            continue
        reports.append(report)
        report['parsed_rows'] = report.pop('imported')
        report['generated_rows'] = 0
        report['duplicate_rows'] = 0
        print(f"parsed={source['municipality']} rows={len(rows)}", flush=True)
        for row in rows:
            if row["source_key"] in seen:
                report['duplicate_rows'] += 1
                continue
            seen.add(row["source_key"])
            report['generated_rows'] += 1
            values.append("(" + ",".join([
                sql_text(row["source_key"]), sql_text("aed"), sql_text(row["name"]),
                sql_text(source["prefecture"]), sql_text(source["municipality"]),
                sql_text(row["address"]), sql_text(row["phone"]), "null",
                str(row["latitude"]), str(row["longitude"]),
                sql_text(source["source_name"]), sql_text(source["dataset_url"]),
                sql_text(source.get("source_date")), sql_text(source["license"]),
                sql_text("自治体公式CSV"), "null",
            ]) + ")")

    if not values:
        raise SystemExit("No valid AED rows were found")

    sql = (
        "begin;\n\ninsert into public.safety_spots "
        "(source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,"
        "latitude,longitude,source_name,source_url,source_date,source_license,geocode_source,geocoded_title) values\n"
        + ",\n".join(values)
        + "\non conflict (source_key) do update set "
        "facility_type=excluded.facility_type,name=excluded.name,prefecture=excluded.prefecture,"
        "municipality=excluded.municipality,address=excluded.address,phone=excluded.phone,"
        "parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,"
        "source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,"
        "source_license=excluded.source_license,geocode_source=excluded.geocode_source,"
        "geocoded_title=excluded.geocoded_title,active=true,updated_at=now();\n\ncommit;\n"
    )
    args.output_sql.write_text(sql, encoding="utf-8")
    args.output_report.write_text(json.dumps({
        "generated_rows": len(values), "sources": reports,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"generated={len(values)} sources={len(reports)}")


if __name__ == "__main__":
    main()
