"""Offline, fail-closed readers for two Tokyo Police cumulative CSV datasets.

Never assumes the actual CSV headers, licensing, coordinates, or publication approval.
The files are snapshots, NOT monthly new incidents or pinpoint crime locations.
No network, Supabase, or operating-system schedulers are contacted.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SOURCE_PAGES = {
    "precursor": "https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html",
    "town_stats": "https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html",
}
REQUIRED = {
    "precursor": ("municipality", "area_label", "event_type"),
    "town_stats": ("municipality", "town", "crime_type", "count"),
}
OPTIONAL = {"precursor": ("source_record_id", "occurred_at", "recognized_at", "published_at", "recognized_count_cumulative"), "town_stats": ()}
MAX_BYTES = 5_000_000
MAX_ROWS = 100_000
MAX_COLUMN_LENGTH = 140


def json_sha(obj: Any) -> str:
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def decode_csv(data: bytes, encoding: str | None = None) -> list[dict[str, str]]:
    if not data or len(data) > MAX_BYTES:
        raise ValueError("CSV input empty or too large")
    # Official downloads may be Japanese Windows encoded. Do not silently use lossy decoding.
    encodings = [encoding] if encoding else ["utf-8-sig", "cp932"]
    text = None
    for enc in encodings:
        try:
            text = data.decode(enc, errors="strict")
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("CSV encoding unknown; specify --encoding")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or len(reader.fieldnames) > 200:
        raise ValueError("invalid CSV headers")
    if len(set(reader.fieldnames)) != len(reader.fieldnames) or any(not x or not x.strip() for x in reader.fieldnames):
        raise ValueError("duplicate/blank CSV header")
    rows = []
    for row in reader:
        if None in row:
            raise ValueError("CSV row has extra fields")
        rows.append(row)
        if len(rows) > MAX_ROWS:
            raise ValueError("too many rows")
    if not rows:
        raise ValueError("no CSV records")
    return rows


def clean(raw: Any, maxlen: int = MAX_COLUMN_LENGTH) -> str:
    s = str(raw if raw is not None else "").strip()
    if len(s) > maxlen or "\x00" in s:
        raise ValueError("bad or oversized field")
    return s


def reshape_wide_town_rows(rows: list[dict], wide_mapping: dict) -> list[dict]:
    """Explicitly reshape one town per row, multiple offense columns to long records.

    DO NOT assume current Tokyo CSV has this layout/column names. Only run after
    official-header verification + manually approved exact mapping.
    """
    if not isinstance(wide_mapping, dict) or set(wide_mapping) != {"municipality", "town", "metrics"}:
        raise ValueError("An explicit wide-town mapping is required")
    municipality_col, town_col = wide_mapping["municipality"], wide_mapping["town"]
    metrics = wide_mapping["metrics"]
    if (not isinstance(municipality_col, str) or not isinstance(town_col, str)
        or not isinstance(metrics, dict) or not 1 <= len(metrics) <= 50
        or len(set([municipality_col, town_col, *metrics.values()])) != 2 + len(metrics)
        or not all(isinstance(name, str) and name and isinstance(col, str) and col
                   for name, col in metrics.items())):
        raise ValueError("Unverified wide-town column mapping")
    header = set(rows[0]) if rows else set()
    if not set([municipality_col, town_col, *metrics.values()]).issubset(header):
        raise ValueError("Official CSV headers changed; no automatic remapping")
    result = []
    for row in rows:
        municipality, town = clean(row[municipality_col], 80), clean(row[town_col], 110)
        if not municipality or not town or town in ("合計", "計", "総数", "小計"):
            raise ValueError("Unidentified municipality/town or aggregate row; manual review")
        for label, col in metrics.items():
            count = clean(row[col], 15).replace(",", "")
            if not re.fullmatch(r"\d{1,10}", count):
                raise ValueError("Non-numeric/blank/negative official count")
            result.append({"municipality": municipality, "town": town,
                           "crime_type": label, "count": count})
            if len(result) > MAX_ROWS:
                raise ValueError("Expanded official CSV exceeds safe row budget")
    if not result:
        raise ValueError("Expanded official CSV empty")
    return result



def reshape_verified_precursor_cumulative(rows: list[dict], config: dict) -> list[dict]:
    """2026-09 police CSV: aggregate displayed row counts; NEVER infer event IDs.

    Original individual records have no stable IDs. Aggregates are identified
    only by municipality, situation and category. No victim attributes survive.
    Values are CSV row counts, not deduplicated incidents or monthly new cases.
    """
    if set(config) != {'municipality', 'place_kind', 'event_type'}:
        raise ValueError('Explicit precursor aggregate mapping required')
    if not rows or len(rows)>MAX_ROWS or len(set(config.values()))!=3 or any(
        not isinstance(v,str) or v not in rows[0] for v in config.values()
    ):
        raise ValueError('Official precursor headers changed')
    groups = {}
    for row in rows:
        city = clean(row[config['municipality']],80)
        place = clean(row[config['place_kind']],110)
        kind = clean(row[config['event_type']],90)
        if not city or not kind:
            raise ValueError('Unrecognized precursor area or category')
        # Empty place column is a missing situation, not a location.
        group_key=(city, place or '場所区分不明', kind)
        groups[group_key]=groups.get(group_key,0)+1
    return [{'municipality':city,'area_label':place,'event_type':kind,
        'recognized_count_cumulative':str(count)} for (city,place,kind),count in sorted(groups.items())]


def reshape_verified_combined_town_rows(rows: list[dict], config: dict) -> list[dict]:
    """Preserve official 市区町丁 verbatim; do not invent municipality boundaries.

    Municipality display slot is the explicitly supplied prefecture label only.
    The full official 市区町丁 is the location label; NEVER geocode from it.
    """
    if not isinstance(config,dict) or set(config)!={'area_column','display_region','metrics'}:
        raise ValueError('Explicit verified combined town mapping required')
    area_col=config['area_column']; region=config['display_region']; metrics=config['metrics']
    if not rows or not isinstance(area_col,str) or area_col not in rows[0] or region!='東京都' or       not isinstance(metrics,dict) or not 1<=len(metrics)<=12 or len(set(metrics.values()))!=len(metrics) or       not all(isinstance(k,str) and isinstance(v,str) and v in rows[0] for k,v in metrics.items()):
        raise ValueError('Unverified combined town CSV columns')
    out=[]
    for row in rows:
        place=clean(row[area_col],110)
        if not place or place in ('合計','計','総数','小計') or place.endswith('合計'):
            raise ValueError('Unknown/aggregate area: manual source review required')
        for label,col in metrics.items():
            value=clean(row[col],15).replace(',','')
            if not re.fullmatch(r'\d{1,10}',value):
                raise ValueError('Missing/non-numeric official count: source review')
            out.append({'municipality':region,'town':place,'crime_type':label,'count':value})
            if len(out)>MAX_ROWS:raise ValueError('Cumulative expansion exceeds cap')
    return out


def normalize_rows(rows: list[dict], *, dataset: str, mapping: dict, year: int, through_month: int) -> list[dict]:
    if dataset not in SOURCE_PAGES:
        raise ValueError("unknown dataset")
    if not (2000 <= year <= 2100 and 1 <= through_month <= 12):
        raise ValueError("invalid recognition period")
    if not isinstance(mapping, dict) or not all(isinstance(v, str) and v for v in mapping.values()):
        raise ValueError("explicit column mapping required")
    if set(mapping) - set(REQUIRED[dataset]) - set(OPTIONAL[dataset]):
        raise ValueError("unknown mapped field")
    if any(k not in mapping for k in REQUIRED[dataset]):
        raise ValueError("required mapping not supplied")
    if len(set(mapping.values())) != len(mapping):
        raise ValueError("duplicate mapped CSV column")
    header = rows[0].keys()
    if any(name not in header for name in mapping.values()):
        raise ValueError("CSV header does not match explicit mapping")
    out = {}
    for row in rows:
        municipality = clean(row[mapping["municipality"]], 80)
        if not municipality:
            raise ValueError("municipality missing")
        if dataset == "town_stats":
            town = clean(row[mapping["town"]], 110)
            kind = clean(row[mapping["crime_type"]], 90)
            raw_count = clean(row[mapping["count"]], 15).replace(",", "")
            if not town or not kind or not re.fullmatch(r"\d{1,10}", raw_count):
                raise ValueError("invalid statistical count or area")
            count = int(raw_count)
            ident = (municipality, town, kind)
            normalized = {"municipality": municipality, "town": town, "crime_type": kind, "recognized_count_cumulative": count,
                          "location_precision": "town", "latitude": None, "longitude": None,
                          "review_status": "pending", "rights_status": "unverified"}
        else:
            area = clean(row[mapping["area_label"]], 110)
            kind = clean(row[mapping["event_type"]], 90)
            if not area or not kind:
                raise ValueError("invalid precursor type or area")
            explicit_id = clean(row[mapping["source_record_id"]], 120) if "source_record_id" in mapping else ""
            dates = {field: clean(row[mapping[field]], 60) if field in mapping else None
                     for field in ("occurred_at", "recognized_at", "published_at")}
            # For official cumulative CSV without event IDs: aggregate counts
            # are source rows, NOT verified unique incidents. Never expose victim columns.
            has_aggregate = "recognized_count_cumulative" in mapping
            raw_aggregate = clean(row[mapping["recognized_count_cumulative"]], 15) if has_aggregate else ""
            if has_aggregate and not re.fullmatch(r"\d{1,10}", raw_aggregate):
                raise ValueError("invalid precursor official row count")
            # No direct address, full raw descriptions, victim details or point location.
            ident = (explicit_id or json_sha([municipality, area, kind, dates])[:24],)
            normalized = {"municipality": municipality, "area_label": area, "event_type": kind,
                          **dates, "source_record_id": explicit_id or None,
                          "identity_verified": bool(explicit_id),
                          "location_precision": "municipality", "latitude": None, "longitude": None,
                          "review_status": "pending" if has_aggregate or explicit_id else "pending_identity",
                          "rights_status": "unverified"}
            if has_aggregate:
                normalized["recognized_count_cumulative"] = int(raw_aggregate)
                normalized["record_count_basis"] = "official_csv_rows_cumulative_not_unique_incidents"
        key = json_sha([dataset, year, through_month, ident])[:32]
        if key in out and out[key] != normalized:
            raise ValueError("same period has conflicting duplicate rows")
        out[key] = normalized
    return [{"id": key, **row} for key, row in sorted(out.items())]


def update_history(old: dict | None, new: dict) -> tuple[dict, dict]:
    """Keep each cumulative release as its own period snapshot, never sum releases."""
    if old and (old.get("schema_version") != 1 or old.get("dataset") != new["dataset"]):
        raise ValueError("wrong snapshot lineage")
    releases = list(old.get("releases", [])) if old else []
    duplicate = 0
    revised = 0
    previous = next((x for x in reversed(releases) if x["year"] == new["year"] and x["through_month"] == new["through_month"]), None)
    if previous:
        if previous["content_hash"] == new["content_hash"]:
            duplicate = 1
        else:
            new["revision"] = previous["revision"] + 1
            new["review_status"] = "pending_correction"
            previous["superseded"] = True
            releases.append(new)
            revised = 1
    else:
        releases.append(new)
    if not duplicate:
        for release in releases:
            if (release["year"], release["through_month"]) != (new["year"], new["through_month"]):
                continue
            if release is new:
                continue
        if new["dataset"] == "town_stats":
            prior = [x for x in releases if x["year"] == new["year"] and x["through_month"] < new["through_month"]]
            if prior:
                prior = max(prior, key=lambda x: (x["through_month"], x["revision"]))
                before = {(x["municipality"], x["town"], x["crime_type"]): x["recognized_count_cumulative"] for x in prior["records"]}
                after = {(x["municipality"], x["town"], x["crime_type"]): x["recognized_count_cumulative"] for x in new["records"]}
                regressions = [key for key, value in after.items() if key in before and value < before[key]]
                omissions = [key for key in before if key not in after]
                new["requires_review"] = bool(regressions or omissions)
                new["review_flags"] = {"cumulative_decreases": len(regressions), "missing_groups": len(omissions)}
    snapshot = {"schema_version": 1, "dataset": new["dataset"], "source_url": SOURCE_PAGES[new["dataset"]],
                "release_mode": "annual_recognized_cumulative", "last_success_at": new["fetched_at"],
                "releases": releases, "publication_enabled": False,
                "notice": "月累計は新規事件数ではありません。位置を正確な発生地点として表示しません。件数0は安全保証ではありません。"}
    return snapshot, {"duplicate_release": duplicate, "revised_release": revised, "periods": len({(v['year'], v['through_month']) for v in releases})}


def atomic_write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", prefix=".police_tmp_", encoding="utf-8", dir=path.parent, delete=False) as tmp:
        try:
            json.dump(data, tmp, ensure_ascii=False, indent=2, sort_keys=True)
            tmp.write("\n")
            tmp.flush(); os.fsync(tmp.fileno())
            name = tmp.name
        except Exception:
            os.unlink(tmp.name)
            raise
    os.replace(name, path)


def run(input_path: Path, mapping_path: Path, snapshot_path: Path, report_path: Path, *, dataset: str,
        year: int, through_month: int, encoding: str | None = None) -> dict:
    source_data = input_path.read_bytes()
    rows = decode_csv(source_data, encoding)
    config = json.loads(mapping_path.read_text(encoding="utf-8"))
    if config.get("dataset") != dataset or not isinstance(config.get("columns"), dict):
        raise ValueError("mapping dataset mismatched")
    if dataset == "town_stats" and "wide_columns" in config:
        if set(config) != {"dataset", "wide_columns", "columns"}:
            raise ValueError("Unknown wide source mapping options")
        rows = reshape_wide_town_rows(rows, config["wide_columns"])
    if dataset == "town_stats" and "combined_town_columns" in config:
        if set(config) != {"dataset", "combined_town_columns", "columns"}:
            raise ValueError("Unknown combined town source mapping options")
        rows = reshape_verified_combined_town_rows(rows,config["combined_town_columns"])
    if dataset == "precursor" and "precursor_aggregate_columns" in config:
        if set(config) != {"dataset", "precursor_aggregate_columns", "columns"}:
            raise ValueError("Unknown precursor aggregate source mapping options")
        rows = reshape_verified_precursor_cumulative(rows,config["precursor_aggregate_columns"])
    clean_rows = normalize_rows(rows, dataset=dataset, mapping=config["columns"], year=year, through_month=through_month)
    now = datetime.now(timezone.utc).isoformat()
    new = {"dataset": dataset, "year": year, "through_month": through_month,
           "fetched_at": now, "revision": 1, "superseded": False, "review_status": "pending",
           "source_file_sha256": hashlib.sha256(source_data).hexdigest(), "records": clean_rows}
    new["content_hash"] = json_sha(clean_rows)
    old = json.loads(snapshot_path.read_text(encoding="utf-8")) if snapshot_path.exists() else None
    merged, stats = update_history(old, new)
    # Unchanged content must not modify the last fully successful snapshot.
    if not stats["duplicate_release"]:
        atomic_write(snapshot_path, merged)
    report = {"dataset": dataset, "period": f"{year}-{through_month:02d}", "records_in_release": len(clean_rows),
              **stats, "publicly_approved": False, "source_page": SOURCE_PAGES[dataset], "rights_status": "unverified",
              "source_file_sha256": new["source_file_sha256"], "error": None}
    atomic_write(report_path, report)
    return report


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Offline Tokyo police cumulative snapshot importer. NO network or DB writes")
    p.add_argument("--dataset", choices=SOURCE_PAGES, required=True)
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--mapping", type=Path, required=True)
    p.add_argument("--year", type=int, required=True)
    p.add_argument("--through-month", type=int, required=True)
    p.add_argument("--snapshot", type=Path, required=True)
    p.add_argument("--report", type=Path, required=True)
    p.add_argument("--encoding", default=None)
    args = p.parse_args(argv)
    try:
        result = run(args.input, args.mapping, args.snapshot, args.report, dataset=args.dataset,
                     year=args.year, through_month=args.through_month, encoding=args.encoding)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        # A failed source fetch must not overwrite the last complete snapshot.
        atomic_write(args.report, {"dataset": args.dataset, "error": str(exc)[:250], "preserved_previous_snapshot": True})
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
