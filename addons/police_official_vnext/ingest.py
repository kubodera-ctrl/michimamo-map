"""Non-production, offline importer for explicit Tokyo police Open DATA exports.

NO network, Supabase, cron, auth or production writes. Requires verified column mapping.
Use separate source ID from existing RSS `spots(category=official)` and resident reports.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

SOURCE_ID = "tokyo_mail_keishicho_opendata"
SOURCE_URL = "https://mail.keishicho.metro.tokyo.lg.jp/opendata/"
POLICY_URL = "https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy"
ATTRIBUTION = "出典：警視庁『メールけいしちょうOpen DATA』／CC BY 4.0。警視庁が本サービスを監修・承認しているものではありません。"
FIELDS = {
    "source_record_id", "title", "summary", "area_label", "event_type",
    "published_at", "occurred_at", "recognized_at", "revision", "source_status",
    "correction_of", "location_precision", "latitude", "longitude", "location_source",
}
REQUIRED = {"title", "summary", "area_label", "event_type", "published_at"}
STATUS = {"active": "active", "corrected": "corrected", "withdrawn": "withdrawn", "訂正": "corrected", "取消": "withdrawn", "取り消し": "withdrawn", "通常": "active"}
PRECISION = {"exact", "town", "municipality", "unknown"}
MAX_ROWS = 20000


def iso_or_none(value: Any) -> str | None:
    if value is None or str(value).strip() == "":
        return None
    s = str(value).strip()
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"invalid ISO date/time: {s[:45]}") from exc
    if dt.tzinfo is None and "T" in s:
        # An unknown timezone must not be silently presented as Japan time.
        raise ValueError("datetime timezone must be explicit")
    return s


def clean(value: Any, cap: int) -> str:
    s = str(value or "").strip()
    if len(s) > cap:
        raise ValueError("field exceeds configured maximum")
    return s


def digest(obj: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def normalize(row: dict, mapping: dict[str, str], *, fixture: bool = False) -> dict:
    if not isinstance(row, dict):
        raise ValueError("record must be an object")
    # Do not silently guess changing CSV column names: mapping is explicit.
    missing = [key for key in REQUIRED if key not in mapping or mapping[key] not in row]
    if missing:
        raise ValueError("required mapped columns missing: " + ", ".join(sorted(missing)))

    def val(name: str) -> Any:
        return row.get(mapping[name]) if name in mapping else None

    title = clean(val("title"), 200)
    summary = clean(val("summary"), 1400)
    area = clean(val("area_label"), 200)
    category = clean(val("event_type"), 100)
    published = iso_or_none(val("published_at"))
    occurred = iso_or_none(val("occurred_at"))
    recognized = iso_or_none(val("recognized_at"))
    if not all((title, summary, area, category, published)):
        raise ValueError("empty required official field")
    state = clean(val("source_status"), 50) or "active"
    if state not in STATUS:
        raise ValueError("unknown source status")
    state = STATUS[state]
    rev_raw = val("revision")
    rev = int(rev_raw) if rev_raw not in ("", None) else 1
    if rev < 1 or rev > 999999:
        raise ValueError("invalid revision")
    original = clean(val("source_record_id"), 250)
    correction_of = clean(val("correction_of"), 250)
    stable = correction_of or original
    derived = not bool(stable)
    # A fallback identity is NOT suitable for automatic correction matching.
    # No summary used in the identity; two distinct unnumbered reports can still collide.
    # Therefore these records remain pending_identity and never auto-publish.
    if not stable:
        stable = digest({"title": title, "occurred_at": occurred, "area": area, "published_at": published})
    rec_id = hashlib.sha256((SOURCE_ID + "\x1f" + stable).encode()).hexdigest()[:32]
    precision = clean(val("location_precision"), 30) or "unknown"
    if precision not in PRECISION:
        raise ValueError("unknown location precision")
    location_source = clean(val("location_source"), 150)
    lat_raw, lon_raw = val("latitude"), val("longitude")
    lat, lon = None, None
    if lat_raw not in ("", None) or lon_raw not in ("", None):
        if lat_raw in ("", None) or lon_raw in ("", None):
            raise ValueError("incomplete coordinates")
        lat, lon = float(lat_raw), float(lon_raw)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("invalid coordinates")
        if precision != "exact" or location_source != "police_explicit_coordinates":
            # Never treat a geocoded administrative-area centroid as a crime scene.
            lat, lon = None, None
    if precision != "exact":
        lat, lon = None, None
    normalized = dict(source_id=SOURCE_ID, id=rec_id, source_record_id=original or None,
        source_name="警視庁・メールけいしちょうOpen DATA", source_url=SOURCE_URL,
        source_policy_url=POLICY_URL, license="CC BY 4.0", attribution=ATTRIBUTION,
        title=title, summary=summary, area_label=area, event_type=category,
        published_at=published, occurred_at=occurred, recognized_at=recognized,
        source_status=state, revision=rev, correction_of=correction_of or None,
        location_precision=precision, location_source=location_source or None,
        latitude=lat, longitude=lon, is_fixture=fixture,
        identity_verified=not derived)
    normalized["content_hash"] = digest({k: v for k, v in normalized.items() if k not in {"id", "content_hash"}})
    # Explicit administrator review is mandatory for every new or updated record.
    normalized["review_status"] = "pending_identity" if derived else "pending"
    return normalized


def load_input(path: Path, encoding: str) -> list[dict]:
    if path.suffix.lower() == ".json":
        obj = json.loads(path.read_text(encoding="utf-8-sig"))
        rows = obj.get("records") if isinstance(obj, dict) else obj
    elif path.suffix.lower() == ".csv":
        with path.open(newline="", encoding=encoding) as f:
            rows = list(csv.DictReader(f))
    else:
        raise ValueError("input must be .csv or .json")
    if not isinstance(rows, list) or not 0 < len(rows) <= MAX_ROWS:
        raise ValueError("empty, oversized or invalid input")
    return rows


def merge(existing: dict, incoming: list[dict], now: str) -> tuple[dict, dict]:
    if existing and (existing.get("schema_version") != 1 or existing.get("source_id") != SOURCE_ID):
        raise ValueError("snapshot schema/source mismatch")
    old_rows = existing.get("records", []) if existing else []
    old = {r["id"]: r for r in old_rows}
    if len(old) != len(old_rows):
        raise ValueError("stored snapshot contains duplicate IDs")
    stats = {"new": 0, "updated": 0, "duplicate": 0, "stale": 0,
             "pending_review": 0, "withdrawn": 0, "total": 0}
    batch_ids: dict[str, str] = {}
    for record in incoming:
        rid = record["id"]
        candidate_key = record["content_hash"]
        if rid in batch_ids:
            if batch_ids[rid] != candidate_key:
                raise ValueError("conflicting revisions in one file; use ordered releases")
            stats["duplicate"] += 1
            continue
        batch_ids[rid] = candidate_key
        current = old.get(rid)
        if current is None:
            record["history"] = []
            old[rid] = record
            stats["new"] += 1
            continue
        if record["revision"] < current["revision"]:
            stats["stale"] += 1
            continue
        if record["revision"] == current["revision"]:
            if record["content_hash"] != current["content_hash"]:
                raise ValueError("same ID+revision has changed content; manual reconciliation required")
            stats["duplicate"] += 1
            continue
        # Correction/revision: pending review and old public state is superseded.
        history = list(current.get("history", []))
        history.append({"revision": current["revision"], "content_hash": current["content_hash"],
            "source_status": current["source_status"], "previous_review_status": current["review_status"],
            "updated_at": now})
        record["history"] = history[-30:]
        old[rid] = record
        stats["updated"] += 1
    records = sorted(old.values(), key=lambda r: r["id"])
    stats["total"] = len(records)
    stats["pending_review"] = sum(r["review_status"].startswith("pending") for r in records)
    stats["withdrawn"] = sum(r["source_status"] == "withdrawn" for r in records)
    out = {"schema_version": 1, "source_id": SOURCE_ID,
           "source_url": SOURCE_URL, "license": "CC BY 4.0", "last_success_at": now,
           "records": records, "statistics": stats,
           "notice": "警察公表情報と利用者投稿は別管理。未承認事案は公開不可。詳細地点ではない地域はピン非表示。"}
    return out, stats


def atomic_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".police_tmp_", suffix=".json", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2, sort_keys=True)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Offline / NONPROD ONLY. No network or DB changes.")
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--mapping", required=True, type=Path)
    p.add_argument("--snapshot", required=True, type=Path)
    p.add_argument("--report", required=True, type=Path)
    p.add_argument("--encoding", choices=["utf-8-sig", "cp932"], default="utf-8-sig")
    p.add_argument("--fixture", action="store_true", help="Mark all input records as synthetic; never public")
    args = p.parse_args(argv)
    old = {}
    try:
        if args.snapshot.exists():
            old = json.loads(args.snapshot.read_text(encoding="utf-8"))
        mapping = json.loads(args.mapping.read_text(encoding="utf-8"))
        if not isinstance(mapping, dict) or any(k not in FIELDS or not isinstance(v, str) or not v for k,v in mapping.items()):
            raise ValueError("invalid explicit field mapping")
        rows = load_input(args.input, args.encoding)
        incoming = [normalize(row, mapping, fixture=args.fixture) for row in rows]
        now = datetime.now(timezone.utc).isoformat()
        out, stats = merge(old, incoming, now)
        # Atomic snapshot: on ANY parse/normalization/merge error the old file is unchanged.
        atomic_json(args.snapshot, out)
        atomic_json(args.report, {"status": "imported_for_review_only", "source_id": SOURCE_ID,
            "input_file_sha256": hashlib.sha256(args.input.read_bytes()).hexdigest(),
            "last_success_at": now, "statistics": stats, "production_changes": 0})
        print(json.dumps({"status": "review_pending", **stats}, ensure_ascii=False))
        return 0
    except (ValueError, UnicodeError, OSError, json.JSONDecodeError) as exc:
        # Minimal failure receipt, no raw record/personal data.
        last_ok = old.get("last_success_at") if isinstance(old, dict) else None
        atomic_json(args.report, {"status": "failed_old_snapshot_preserved", "error_type": type(exc).__name__,
            "error": str(exc)[:200], "last_success_at": last_ok, "production_changes": 0})
        print(f"import blocked: {type(exc).__name__}", file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())
