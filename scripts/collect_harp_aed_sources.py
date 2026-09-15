#!/usr/bin/env python3
"""Collect reusable AED datasets from SS OpenData catalogs missing from the ledger."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import csv
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import unicodedata
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from import_aed_open_data import decode_csv

BASE = "https://www.harp.lg.jp"
SEARCH = BASE + "/opendata/dataset/search/"
USER_AGENT = "machimamo-aed-collector/1.0"


def fetch(url: str, timeout: int = 45) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ja"})
    with urlopen(request, timeout=timeout) as response:
        return response.read()


class SearchParser(HTMLParser):
    def __init__(self, base: str = BASE):
        super().__init__()
        self.base = base
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        href = dict(attrs).get("href", "")
        if tag == "a" and re.fullmatch(r"/(?:opendata/)?dataset/\d+\.html", href):
            self.links.append(urljoin(self.base, href))


class DatasetParser(HTMLParser):
    def __init__(self, base: str = BASE):
        super().__init__()
        self.base = base
        self.title = ""
        self.area = ""
        self.resources: list[dict[str, str]] = []
        self._capture = ""
        self._text: list[str] = []
        self._resource_depth = 0
        self._resource: dict[str, str] | None = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = set(attrs.get("class", "").split())
        if tag == "h1" and "name" in classes:
            self._capture, self._text = "title", []
        elif tag == "a" and "area" in classes:
            self._capture, self._text = "area", []
        if tag == "div" and "resource" in classes and not self._resource_depth:
            self._resource_depth = 1
            self._resource = {"text": "", "license": "", "url": ""}
        elif tag == "div" and self._resource_depth:
            self._resource_depth += 1
        if self._resource is not None:
            if tag == "img" and attrs.get("alt"):
                self._resource["license"] += " " + attrs["alt"]
            if tag == "a" and "download" in classes:
                # The portal's data-url can point at an expired /fs path while
                # the public resource href remains stable.
                self._resource["url"] = urljoin(self.base, attrs.get("href", "")) or attrs.get("data-url", "")

    def handle_data(self, data):
        if self._capture:
            self._text.append(data)
        if self._resource is not None:
            self._resource["text"] += " " + data

    def handle_endtag(self, tag):
        if tag in ("h1", "a") and self._capture:
            value = " ".join("".join(self._text).split())
            if self._capture == "title":
                self.title = value
            elif self._capture == "area":
                self.area = value
            self._capture, self._text = "", []
        if tag == "div" and self._resource_depth:
            self._resource_depth -= 1
            if not self._resource_depth and self._resource is not None:
                self.resources.append(self._resource)
                self._resource = None


def parse_dataset(html: str, url: str, prefecture: str = "北海道", base: str = BASE) -> dict | None:
    parser = DatasetParser(base)
    parser.feed(html)
    bracketed = re.search(r"【(?:北海道)?([^】]+?[市町村])】", parser.title)
    municipality = parser.area or (bracketed.group(1) if bracketed else "")
    if "aed" not in unicodedata.normalize("NFKC", parser.title).casefold() or not municipality or municipality == prefecture:
        return None
    reusable = [resource for resource in parser.resources
                if resource["url"] and "CC BY" in resource["license"]
                and (re.search(r"\.(csv|xlsx?)(?:$|\?)", resource["url"], re.I)
                     or re.search(r"\((CSV|XLSX?)\b", resource["text"], re.I))]
    if not reusable:
        return None
    updated = re.search(
        r"<dt(?:\s+[^>]*)?>更新日時</dt>\s*<dd(?:\s+[^>]*)?>(\d{4})(?:-|年)(\d{1,2})(?:-|月)(\d{1,2})(?:日)?",
        html,
    )
    resource = min(reusable, key=lambda item: 0 if "csv" in (item["url"] + item["text"]).casefold() else 1)
    return {
        "prefecture": prefecture,
        "municipality": municipality,
        "source_name": parser.title,
        "source_url": url,
        "resource_url": resource["url"],
        "license_id": "CC BY",
        "source_updated_at": (f"{int(updated.group(1)):04d}-{int(updated.group(2)):02d}-{int(updated.group(3)):02d}"
                              if updated else None),
    }


def collect_dataset_links(base: str = BASE, search_path: str = "/opendata/dataset/search/") -> list[str]:
    links: list[str] = []
    for page in range(1, 100):
        search = urljoin(base, search_path)
        url = search + "?s%5Bkeyword%5D=AED" if page == 1 else (
            urljoin(base, search_path.rstrip("/") + f"/index.p{page}.html?s%5Bkeyword%5D=AED")
        )
        parser = SearchParser(base)
        parser.feed(fetch(url).decode("utf-8", errors="replace"))
        page_links = list(dict.fromkeys(parser.links))
        if not page_links:
            break
        links.extend(page_links)
    return list(dict.fromkeys(links))


def detect_header_row(payload: bytes) -> int:
    if payload.startswith(b"PK\x03\x04"):
        return 1
    try:
        rows = csv.reader(io.StringIO(decode_csv(payload)))
        for index, row in enumerate(rows, 1):
            cells = {unicodedata.normalize("NFKC", str(value)).replace(" ", "") for value in row}
            if cells & {"名称", "施設名", "施設名称"} and cells & {"住所", "所在地", "所在地_連結表記"}:
                return index
            if index >= 10:
                break
    except Exception:
        pass
    return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ledger", type=Path, required=True)
    ap.add_argument("--output-dir", type=Path, required=True)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--base", default=BASE)
    ap.add_argument("--search-path", default="/opendata/dataset/search/")
    ap.add_argument("--prefecture", default="北海道")
    args = ap.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    ledger = json.loads(args.ledger.read_text())
    unpublished = {(row["prefecture"], row["municipality"])
                   for row in ledger if not row["public_aed_count"]}
    sources, excluded = [], []
    dataset_links = collect_dataset_links(args.base, args.search_path)
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        jobs = {pool.submit(fetch, url): url for url in dataset_links}
        for job in as_completed(jobs):
            url = jobs[job]
            try:
                source = parse_dataset(job.result().decode("utf-8", errors="replace"), url,
                                       args.prefecture, args.base)
                if source and (source["prefecture"], source["municipality"]) in unpublished:
                    sources.append(source)
            except Exception as error:
                excluded.append({"source_url": url, "reason": f"{type(error).__name__}: {error}"[:300]})
    sources.sort(key=lambda source: source["municipality"])
    def download(source):
        payload = fetch(source["resource_url"])
        cache = args.output_dir / (hashlib.sha256(source["resource_url"].encode()).hexdigest() + ".bin")
        cache.write_bytes(payload)
        header_row = detect_header_row(payload)
        if header_row > 1:
            source["header_row"] = header_row
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 4))) as pool:
        jobs = {pool.submit(download, source): source for source in sources}
        for job in as_completed(jobs):
            source = jobs[job]
            try:
                job.result()
            except Exception as error:
                excluded.append({"source_url": source["source_url"],
                                 "resource_url": source["resource_url"],
                                 "reason": f"download:{type(error).__name__}: {error}"[:300]})
    failed_resources = {row.get("resource_url") for row in excluded if row.get("resource_url")}
    sources = [source for source in sources if source["resource_url"] not in failed_resources]
    manifest = {"sources": sources, "excluded": excluded}
    (args.output_dir / "supplement.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (args.output_dir / "features.json").write_text("[]\n")
    (args.output_dir / "sources.json").write_text("{}\n")
    print(json.dumps({"catalog_datasets": len(dataset_links),
                      "unpublished_sources": len(sources),
                      "municipalities": [source["municipality"] for source in sources],
                      "errors": len(excluded)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
