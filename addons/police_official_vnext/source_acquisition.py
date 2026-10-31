"""Read-only official Tokyo Police CSV discovery and bounded download utility.

A source-page HTML hyperlink is the sole source of download URLs. Never guess
CSV URL names, call undocumented APIs, or grant publishing rights from downloads.
The tool does NOT write to DB, GitHub, SNS, or a production/public web directory.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html.parser
import io
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

SOURCE_PAGES = {
    "precursor": "https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html",
    "town_stats": "https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html",
}
MAX_HTML_BYTES = 2_000_000
MAX_CSV_BYTES = 8_000_000
MAX_HEADER_COLUMNS = 200


class StrictNoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Unverified source redirect blocked")


class AnchorReader(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.anchors: list[tuple[str, str]] = []
        self._href = None
        self._txt = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            self._href = dict(attrs).get("href")
            self._txt = []

    def handle_data(self, data):
        if self._href is not None:
            self._txt.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, " ".join(self._txt)))
            self._href = None
            self._txt = []


def verified_url(value: str, dataset: str) -> str:
    if dataset not in SOURCE_PAGES:
        raise ValueError("Unknown source dataset")
    u = urlparse(value)
    allowed = f"/about_mpd/jokyo_tokei/jokyo/{'zencho' if dataset == 'precursor' else 'ninchikensu'}.files/"
    if (u.scheme != "https" or u.netloc != "www.keishicho.metro.tokyo.lg.jp"
        or not u.path.startswith(allowed) or not u.path.lower().endswith(".csv")
        or u.username or u.password or u.port or u.query or u.fragment or '..' in u.path):
        raise ValueError("Unverified or cross-source CSV URL")
    return value


def discover_official_csv(html_text: str, dataset: str, year: int, through_month: int) -> str:
    if dataset not in SOURCE_PAGES or not (2019 <= year <= 2100 and 1 <= through_month <= 12):
        raise ValueError("Invalid dataset/year/month")
    # After 2019, Reiwa N = Gregorian year - 2018; check source page's year context.
    if f"令和{year - 2018}年" not in re.sub(r"\s+", "", re.sub(r"<[^>]*>", "", html_text)):
        raise ValueError("Official source page does not document requested year")
    parser = AnchorReader(); parser.feed(html_text)
    hits = set()
    for href, label in parser.anchors:
        if not re.search(rf"(?<!\d){through_month}\s*月\s*累計", label):
            continue
        url = urljoin(SOURCE_PAGES[dataset], href)
        try:
            hits.add(verified_url(url, dataset))
        except ValueError:
            continue
    if len(hits) != 1:
        raise ValueError(f"Official CSV ambiguous or missing ({len(hits)} candidates)")
    return next(iter(hits))


def fetch_bounded(url: str, *, max_bytes: int, content_kind: str) -> bytes:
    # No network calls until the owner actively runs --fetch; always strict official hosts.
    if content_kind == "html" and url not in SOURCE_PAGES.values():
        raise ValueError("Source-page URL must be a fixed approved URL")
    if content_kind == "csv" and not any(
        u == url for u in (verified_url(url, d) for d in SOURCE_PAGES if urlparse(url).path.startswith(
            f"/about_mpd/jokyo_tokei/jokyo/{'zencho' if d == 'precursor' else 'ninchikensu'}.files/"))
    ):
        raise ValueError("CSV origin denied")
    req = Request(url, headers={"User-Agent": "SUMION-Machimamo-PublicOD-ReadOnly/1.0", "Accept": "text/html,text/csv,application/octet-stream"})
    opener = build_opener(StrictNoRedirect)
    with opener.open(req, timeout=15) as resp:
        data = resp.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise ValueError("Official resource exceeds configured size")
        typ = resp.headers.get_content_type()
        if content_kind == "html":
            if typ not in ("text/html", "application/xhtml+xml"):
                raise ValueError("Source page returned non-HTML content")
        elif typ in ("text/html", "application/xhtml+xml"):
            raise ValueError("CSV URL returned HTML page instead of CSV")
        return data


def inspect_header(data: bytes) -> dict:
    if not data or len(data) > MAX_CSV_BYTES:
        raise ValueError("CSV empty or exceeds cap")
    decoded = None; used = None
    for enc in ("utf-8-sig", "cp932"):
        try:
            decoded = data.decode(enc, errors="strict"); used = enc; break
        except UnicodeDecodeError:
            pass
    if decoded is None:
        raise ValueError("Unknown CSV encoding; manual review needed")
    reader = csv.reader(io.StringIO(decoded))
    try:
        header = next(reader)
    except StopIteration:
        raise ValueError("CSV empty")
    if (not header or len(header) > MAX_HEADER_COLUMNS or len(set(header)) != len(header)
        or any(not h.strip() or len(h)>160 for h in header)):
        raise ValueError("CSV invalid/duplicate column names")
    rows = 0
    for row in reader:
        if len(row) != len(header):
            raise ValueError("CSV inconsistent row widths")
        rows += 1
        if rows > 100000:
            raise ValueError("CSV exceeds 100,000 rows")
    if not rows:
        raise ValueError("CSV contains header only")
    # Do not include any personal row data in this diagnostic.
    return {"sha256": hashlib.sha256(data).hexdigest(), "encoding": used,
            "columns": header, "rows": rows, "bytes": len(data), "rights_status": "unverified",
            "public_release": False}


def atomic_bytes(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".official_", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp): os.unlink(temp)


def run(*, dataset: str, year: int, month: int, offline_page: Path | None,
        offline_csv: Path | None, private_dir: Path, fetch: bool = False) -> dict:
    if fetch and (offline_page is not None or offline_csv is not None):
        raise ValueError("Choose offline files OR explicit network fetch, never both")
    if fetch:
        page_bytes = fetch_bounded(SOURCE_PAGES[dataset], max_bytes=MAX_HTML_BYTES, content_kind="html")
    elif offline_page:
        page_bytes = offline_page.read_bytes()
        if len(page_bytes)>MAX_HTML_BYTES: raise ValueError("Offline source page oversized")
    else:
        raise ValueError("Source page HTML required; --fetch is opt-in and read-only")
    page = page_bytes.decode("utf-8-sig", errors="strict")
    csv_url = discover_official_csv(page, dataset, year, month)
    receipt = {"source_page": SOURCE_PAGES[dataset], "discovered_csv_url": csv_url,
        "year": year, "through_month": month,
        "source_page_sha256": hashlib.sha256(page_bytes).hexdigest(),
        "verified_csv_contents": False, "rights_status": "unverified",
        "publishing": False, "database_changes": False, "download_attempted": bool(fetch),
        "verified_at": datetime.now(timezone.utc).isoformat()}
    if fetch:
        csv_bytes = fetch_bounded(csv_url, max_bytes=MAX_CSV_BYTES, content_kind="csv")
    elif offline_csv:
        csv_bytes = offline_csv.read_bytes()
    else:
        return receipt  # link discovery only, no raw CSV dataset
    info = inspect_header(csv_bytes)
    receipt.update({"verified_csv_contents": True, **info})
    # Raw data is intentionally NOT saved to any public directory or GitHub.
    # Caller must supply a PRIVATE local-only location; offline test uses tempdir.
    if not private_dir.name.endswith("private"):
        raise ValueError("Private directory name must end with 'private'")
    target=private_dir/(f"{dataset}-{year}-{month:02d}-{info['sha256'][:12]}.csv")
    if target.exists() and target.read_bytes()!=csv_bytes:
        raise ValueError("Existing private file mismatch")
    if not target.exists(): atomic_bytes(target, csv_bytes)
    return receipt


def main():
    a=argparse.ArgumentParser()
    a.add_argument("--dataset", choices=tuple(SOURCE_PAGES), required=True)
    a.add_argument("--year",type=int,required=True);a.add_argument("--month",type=int,required=True)
    a.add_argument("--html",type=Path);a.add_argument("--csv",type=Path)
    a.add_argument("--private-dir",type=Path,required=True)
    a.add_argument("--fetch",action="store_true",help="Opt-in external READ ONLY download; never writes DB")
    q=a.parse_args();result=run(dataset=q.dataset,year=q.year,month=q.month,offline_page=q.html,offline_csv=q.csv,private_dir=q.private_dir,fetch=q.fetch)
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__ == "__main__": main()
