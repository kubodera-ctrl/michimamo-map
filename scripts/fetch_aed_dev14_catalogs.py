"""Fetch the latest reusable resource for queued regional AED catalogues.

This downloader is intentionally separate from publication. It only preserves
official source snapshots and metadata so every row can be reviewed before any
Supabase write.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import html
import http.cookiejar
import json
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

from import_aed_open_data import read_records


ROOT = Path("data/aed_dev14")
RAW = ROOT / "raw"
QUEUE = Path("data/aed_dev11/municipality_queue.json")
USER_AGENT = "machimamo-map-aed-source-audit/2026-09-15"


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []
        self._href: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            self._href = dict(attrs).get("href")
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "a" and self._href is not None:
            self.links.append({"href": self._href, "text": " ".join("".join(self._text).split())})
            self._href = None
            self._text = []


def page_text(payload: bytes) -> str:
    text = payload.decode("utf-8", "replace")
    text = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", text, flags=re.I | re.S)
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", text)).split())


def links(payload: bytes, base_url: str) -> list[dict[str, str]]:
    parser = LinkParser()
    parser.feed(payload.decode("utf-8", "replace"))
    return [{"href": urllib.parse.urljoin(base_url, x["href"]), "text": x["text"]} for x in parser.links]


def metadata(payload: bytes, url: str) -> dict[str, object]:
    text = page_text(payload)
    found = links(payload, url)
    download = next((x["href"] for x in found if "/resource_download/" in x["href"]), None)
    filename = re.search(r"ファイル名\s+(.+?\.(?:csv|xlsx?|zip|json|geojson|xml))\b", text, re.I)
    updated = re.search(r"最終更新\s+(\d{4})年(\d{1,2})月(\d{1,2})日", text)
    fmt = re.search(r"形式\s+(CSV|XLSX?|ZIP|JSON|GEOJSON|XML)\b", text, re.I)
    license_match = re.search(r"ライセンス\s+(.+?)(?:このデータセット|カテゴリ|タグ|$)", text)
    title = re.search(r"リソース名\s+(.+?)(?:ファイル名|このリソースの情報)", text)
    return {
        "resource_url": url,
        "resource_id": url.rstrip("/").rsplit("/", 1)[-1],
        "resource_title": title.group(1).strip() if title else "",
        "download_url": download,
        "filename": filename.group(1).strip() if filename else None,
        "updated_at": "-".join(f"{int(x):02d}" for x in updated.groups()) if updated else None,
        "format": fmt.group(1).upper() if fmt else None,
        "license": license_match.group(1).strip() if license_match else None,
    }


def resource_rank(item: dict[str, object]) -> tuple[str, int, int]:
    title = str(item.get("resource_title") or "")
    fmt = str(item.get("format") or "")
    is_tabular = int(fmt in {"CSV", "XLS", "XLSX"} or bool(re.search(r"CSV|Excel|XLSX?", title, re.I)))
    is_utf8 = int(bool(re.search(r"UTF[-_ ]?8", title, re.I)))
    return str(item.get("updated_at") or "0000-00-00"), is_tabular, is_utf8


@dataclass
class Session:
    opener: urllib.request.OpenerDirector

    @classmethod
    def create(cls) -> "Session":
        jar = http.cookiejar.CookieJar()
        return cls(urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar)))

    def get(self, url: str, referer: str | None = None) -> tuple[bytes, dict[str, str], str]:
        headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
        if referer:
            headers["Referer"] = referer
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                with self.opener.open(urllib.request.Request(url, headers=headers), timeout=45) as response:
                    return response.read(), dict(response.headers.items()), response.geturl()
            except Exception as error:  # evidence is recorded; publication never runs here
                last_error = error
                if attempt < 2:
                    time.sleep(2 ** attempt)
        raise RuntimeError(str(last_error))


def process(entry: dict[str, object]) -> dict[str, object]:
    session = Session.create()
    profiles: list[dict[str, object]] = []
    errors: list[dict[str, str]] = []
    for resource_url in entry.get("resource_pages", []):
        try:
            payload, _, final_url = session.get(str(resource_url), str(entry["url"]))
            profiles.append(metadata(payload, final_url))
        except Exception as error:
            errors.append({"url": str(resource_url), "error": type(error).__name__ + ": " + str(error)})
    eligible = [x for x in profiles if x.get("download_url") and resource_rank(x)[1]]
    if not eligible:
        return {**entry, "fetch_status": "resource_selection_failed", "resource_profiles": profiles, "errors": errors}
    selected = max(eligible, key=resource_rank)
    try:
        payload, headers, final_url = session.get(str(selected["download_url"]), str(selected["resource_url"]))
        code = str(entry["code"])
        resource_id = str(selected["resource_id"])
        target = RAW / f"{code}_{resource_id}.bin"
        target.write_bytes(payload)
        parsed: dict[str, object] = {}
        try:
            rows = read_records(payload)
            parsed = {"rows": len(rows), "fields": list(rows[0]) if rows else [], "sample": rows[:2]}
        except Exception as error:
            parsed = {"parse_error": type(error).__name__ + ": " + str(error)}
        return {
            **entry,
            "fetch_status": "downloaded",
            "selected_resource": selected,
            "download_final_url": final_url,
            "content_type": headers.get("Content-Type"),
            "content_disposition": headers.get("Content-Disposition"),
            "snapshot": str(target),
            "bytes": len(payload),
            "sha256": hashlib.sha256(payload).hexdigest(),
            **parsed,
            "resource_profiles": profiles,
            "errors": errors,
        }
    except Exception as error:
        return {
            **entry,
            "fetch_status": "download_failed",
            "selected_resource": selected,
            "resource_profiles": profiles,
            "errors": errors + [{"url": str(selected["download_url"]), "error": type(error).__name__ + ": " + str(error)}],
        }


def queued_catalogs() -> list[dict[str, object]]:
    rows = json.loads(QUEUE.read_text())
    result: list[dict[str, object]] = []
    for row in rows:
        if row.get("status") != "candidate_processing_required":
            continue
        for item in row.get("new_catalog_candidates", []):
            result.append({**item, "code": row["code"], "municipality": row["municipality"]})
    return result


def main() -> None:
    ROOT.mkdir(exist_ok=True)
    RAW.mkdir(exist_ok=True)
    entries = queued_catalogs()
    results: list[dict[str, object]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(process, entries):
            results.append(result)
            print(result["code"], result["municipality"], result["fetch_status"], result.get("rows"), flush=True)
    (ROOT / "catalog_fetch.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    summary = {
        "date": "2026-09-15",
        "datasets": len(results),
        "downloaded": sum(x.get("fetch_status") == "downloaded" for x in results),
        "parsed_rows": sum(int(x.get("rows") or 0) for x in results),
        "failed": [{"code": x["code"], "municipality": x["municipality"], "status": x["fetch_status"]} for x in results if x.get("fetch_status") != "downloaded"],
        "publication": "not_started",
    }
    (ROOT / "catalog_fetch_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
