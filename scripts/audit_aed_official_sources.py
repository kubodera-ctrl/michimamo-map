"""Audit all 1,741 municipal official sites for AED source availability.

Official site URLs are joined by the six-digit local-government code. Search
results are accepted only when the destination is on that official domain and
its title or URL mentions AED. Empty results are recorded as "not confirmed",
never as evidence that an AED page does not exist.
"""
from __future__ import annotations

import argparse
import base64
import concurrent.futures
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "aed_municipality_audit"
USER_AGENT = "machimamo-aed-audit/1.0"
SEARCH_USER_AGENT = "Mozilla/5.0 (compatible; MachimamoAudit/1.0)"
TERMS = ("aed", "ＡＥＤ", "自動体外式除細動器")
QUERY_NAMES = ("q", "query", "keyword", "keywords", "key", "search", "searchword", "qt")
CHECKPOINT_EVERY = 25
WIKIDATA_QUERY = """SELECT ?item ?code ?website ?itemLabel WHERE {
  ?item wdt:P17 wd:Q17; wdt:P429 ?code; wdt:P856 ?website.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja". }
}"""


def fetch_wikidata() -> dict:
    url = "https://query.wikidata.org/sparql?" + urlencode({"query": WIKIDATA_QUERY, "format": "json"})
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"})
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def fetch(url: str, timeout: int = 6) -> tuple[str, str, int]:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.5"})
    with urlopen(request, timeout=timeout) as response:
        payload = response.read(3_000_000)
        charset = response.headers.get_content_charset() or "utf-8"
        try:
            text = payload.decode(charset)
        except (LookupError, UnicodeDecodeError):
            text = payload.decode("utf-8", errors="replace")
        return text, response.geturl(), response.status


def decode_bing_redirect(url: str) -> str:
    """Return Bing's encoded destination URL when present."""
    parsed = urlparse(url)
    if not parsed.hostname or not parsed.hostname.endswith("bing.com"):
        return url
    encoded = (parse_qs(parsed.query).get("u") or [""])[0]
    if not encoded.startswith("a1"):
        return url
    payload = encoded[2:]
    try:
        return base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return url


def search_official_domain(municipality: str, official_url: str) -> tuple[list[str], list[str]]:
    host = (urlparse(official_url).hostname or "").lower()
    query = f'"{municipality}" AED 自動体外式除細動器 {host}'
    url = "https://www.bing.com/search?" + urlencode({"q": query, "count": "10", "setlang": "ja"})
    errors = []
    for attempt in range(2):
        try:
            request = Request(url, headers={"User-Agent": SEARCH_USER_AGENT, "Accept-Language": "ja,en;q=0.5"})
            with urlopen(request, timeout=18) as response:
                html = response.read(1_500_000).decode(response.headers.get_content_charset() or "utf-8", errors="replace")
            parser = PageParser()
            parser.feed(html)
            results = []
            for href, label in parser.links:
                destination = decode_bing_redirect(href)
                if (same_official_host(destination, official_url)
                        and destination.startswith(("http://", "https://"))
                        and term_present(label + " " + urlparse(destination).path)):
                    results.append(destination.split("#", 1)[0])
            return list(dict.fromkeys(results)), errors
        except Exception as error:
            errors.append(f"attempt{attempt + 1}:{type(error).__name__}:{error}"[:300])
            time.sleep(0.5 * (attempt + 1))
    return [], errors


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.forms: list[dict] = []
        self._href = None
        self._anchor = []
        self._form = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "a" and attrs.get("href"):
            self._href = attrs["href"]
            self._anchor = []
        elif tag == "form":
            self._form = {"action": attrs.get("action", ""), "method": attrs.get("method", "get").lower(), "inputs": []}
        elif tag == "input" and self._form is not None:
            self._form["inputs"].append(dict(attrs))

    def handle_data(self, data):
        if self._href is not None:
            self._anchor.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self._href is not None:
            self.links.append((self._href, " ".join(self._anchor).strip()))
            self._href = None
        elif tag == "form" and self._form is not None:
            self.forms.append(self._form)
            self._form = None


def same_official_host(url: str, official_url: str) -> bool:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    official = (urlparse(official_url).hostname or "").lower().removeprefix("www.")
    return bool(host and official and (host == official or host.endswith("." + official) or official.endswith("." + host)))


def term_present(text: str) -> bool:
    folded = text.casefold()
    return any(term.casefold() in folded for term in TERMS)


def extract_aed_links(html: str, base_url: str, official_url: str) -> list[str]:
    parser = PageParser()
    parser.feed(html)
    found = []
    for href, label in parser.links:
        url = urljoin(base_url, href)
        if same_official_host(url, official_url) and term_present(label + " " + href):
            found.append(url.split("#", 1)[0])
    return list(dict.fromkeys(found))


def choose_search_form(html: str, base_url: str, official_url: str):
    parser = PageParser()
    parser.feed(html)
    for form in parser.forms:
        if form["method"] != "get":
            continue
        action = urljoin(base_url, form["action"] or base_url)
        if not same_official_host(action, official_url):
            continue
        names = [i.get("name", "") for i in form["inputs"]]
        query_name = next((name for name in names if name.casefold() in QUERY_NAMES), None)
        action_hint = (form["action"] or "").casefold()
        if query_name and ("search" in action_hint or "kensaku" in action_hint or query_name.casefold() in QUERY_NAMES):
            fixed = {}
            for item in form["inputs"]:
                name, value = item.get("name"), item.get("value")
                if name and value and item.get("type", "").lower() in ("hidden", "submit"):
                    fixed[name] = value
            return action, query_name, fixed
    return None


def build_search_url(action: str, query_name: str, fixed: dict, term: str) -> str:
    parsed = urlparse(action)
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params.update(fixed)
    params[query_name] = term
    return urlunparse(parsed._replace(query=urlencode(params)))


def sitemap_candidates(official_url: str) -> list[str]:
    base = official_url.rstrip("/") + "/"
    candidates = [urljoin(base, "sitemap.xml"), urljoin(base, "sitemap_index.xml")]
    try:
        robots, final_url, _ = fetch(urljoin(base, "robots.txt"), timeout=3)
        for value in re.findall(r"(?im)^\s*sitemap\s*:\s*(\S+)", robots):
            candidates.append(urljoin(final_url, value))
    except Exception:
        pass
    return list(dict.fromkeys(candidates))[:5]


def inspect_sitemaps(official_url: str) -> tuple[list[str], int]:
    found, checked = [], 0
    queue = sitemap_candidates(official_url)
    seen = set()
    while queue and checked < 2:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            xml, final_url, _ = fetch(url, timeout=4)
            root = ET.fromstring(xml)
        except Exception:
            continue
        checked += 1
        locations = [(node.text or "").strip() for node in root.iter() if node.tag.rsplit("}", 1)[-1] == "loc"]
        if root.tag.rsplit("}", 1)[-1] == "sitemapindex":
            queue.extend(locations[:1])
            continue
        for location in locations:
            if same_official_host(location, official_url) and term_present(location):
                found.append(location)
    return list(dict.fromkeys(found)), checked


def inspect_source_page(url: str, official_url: str) -> dict:
    try:
        html, final_url, status = fetch(url, timeout=6)
    except Exception as error:
        return {"page_fetch_status": "failed", "page_fetch_error": f"{type(error).__name__}: {error}"[:300]}
    parser = PageParser()
    parser.feed(html)
    downloads = []
    for href, label in parser.links:
        candidate = urljoin(final_url, href)
        path = urlparse(candidate).path.casefold()
        if same_official_host(candidate, official_url) and (re.search(r"\.(csv|xlsx?|geojson|json|zip)(?:$|\?)", candidate, re.I) or "オープンデータ" in label):
            downloads.append(candidate.split("#", 1)[0])
    folded = html.casefold()
    if "cc by 4.0" in folded or "creative commons attribution 4.0" in folded:
        reuse = "CC BY 4.0表記をページ内で検出"
    elif "クリエイティブ・コモンズ" in html or "creative commons" in folded:
        reuse = "Creative Commons表記あり・版と対象範囲は要確認"
    elif "オープンデータ" in html:
        reuse = "オープンデータ表記あり・利用規約との紐付けは要確認"
    else:
        reuse = "再利用条件をページ内で確認できず"
    return {"page_fetch_status": "ok", "page_http_status": status, "source_url": final_url,
            "download_candidates": list(dict.fromkeys(downloads))[:20], "reuse_status": reuse}


def audit_one(row: dict, official_url: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    result = {"code": row["code"], "local_government_code": row["local_government_code"],
              "prefecture": row["prefecture"], "municipality": row["municipality"],
              "official_site_url": official_url, "investigated_at": now}
    if row.get("source_url"):
        result.update({"investigation_status": "official_source_already_cataloged",
                       "source_url": row["source_url"], "source_url_count": row.get("source_url_count", 1),
                       "reuse_status": " / ".join(row.get("source_licenses") or []) or "既存取込記録を参照",
                       "acquisition_status": "既存公式データを確認済み", "next_action": "④で更新差分と網羅性を確認"})
        return result
    candidates, errors = search_official_domain(row["municipality"], official_url)
    result.update({"search_method": "public_web_search_restricted_to_official_domain",
                   "search_checked": not errors or bool(candidates), "search_errors": errors})
    if candidates:
        result.update({"investigation_status": "official_aed_page_found",
                       "acquisition_status": "データ取得候補あり" if any(re.search(r"\.(csv|xlsx?|geojson|json|zip)(?:$|\?)", url, re.I) for url in candidates) else "公式ページのみ確認",
                       "aed_page_candidates": candidates[:20],
                       "source_url": candidates[0],
                       "reuse_status": "再利用条件は④で公式ページ・利用規約を確認",
                       "next_action": "④でデータ項目・座標・再利用条件を検証"})
    elif errors:
        result.update({"investigation_status": "official_domain_search_failed",
                       "acquisition_status": "取得可否未確定",
                       "blocker_reason": "公式ドメイン限定検索が2回とも失敗",
                       "next_action": "検索制限解除後に公式サイト内を再確認"})
    else:
        result.update({"investigation_status": "official_site_identified_source_not_confirmed",
                       "acquisition_status": "公開データ未確認",
                       "reuse_status": "対象となる公式AED情報源を未確認のため判定対象なし",
                       "blocker_reason": "公開検索で公式ドメイン内のAED情報源を確認できず（不存在を意味しない）",
                       "next_action": "更新運用で公式サイトの消防・防災・オープンデータ欄を再確認"})
    return result


def choose_websites(wikidata: dict, ledger: list[dict]) -> dict[str, str]:
    allowed = {row["local_government_code"] for row in ledger}
    candidates = {}
    for binding in wikidata["results"]["bindings"]:
        code = binding["code"]["value"]
        url = binding["website"]["value"]
        if code not in allowed:
            continue
        parsed = urlparse(url)
        score = (parsed.scheme == "https", parsed.path in ("", "/"), not re.search(r"/(en|eng|english)(/|$)", parsed.path, re.I), -len(url))
        if code not in candidates or score > candidates[code][0]:
            candidates[code] = (score, url)
    return {code: value[1] for code, value in candidates.items()}


def atomic_write(path: Path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wikidata", type=Path, help="optional saved Wikidata SPARQL JSON response")
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    ledger_path = DATA / "ledger.json"
    output_path = DATA / "official_source_audit_20260915.json"
    ledger = json.loads(ledger_path.read_text())
    wikidata = json.loads(args.wikidata.read_text()) if args.wikidata else fetch_wikidata()
    websites = choose_websites(wikidata, ledger)
    if set(websites) != {row["local_government_code"] for row in ledger}:
        missing = sorted({row["local_government_code"] for row in ledger} - set(websites))
        raise SystemExit(f"Missing official site URLs for {len(missing)} municipalities: {missing[:20]}")
    existing = {}
    if output_path.exists():
        existing = {row["code"]: row for row in json.loads(output_path.read_text())}
    pending = [row for row in ledger if row["code"] not in existing]
    if args.limit:
        pending = pending[:args.limit]
    lock = threading.Lock()
    completed = 0
    def save():
        atomic_write(output_path, sorted(existing.values(), key=lambda row: row["code"]))
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        future_rows = {pool.submit(audit_one, row, websites[row["local_government_code"]]): row for row in pending}
        for future in concurrent.futures.as_completed(future_rows):
            row = future_rows[future]
            try:
                audited = future.result()
            except Exception as error:
                audited = {"code": row["code"], "local_government_code": row["local_government_code"],
                           "prefecture": row["prefecture"], "municipality": row["municipality"],
                           "official_site_url": websites[row["local_government_code"]],
                           "investigated_at": datetime.now(timezone.utc).isoformat(),
                           "investigation_status": "audit_error", "acquisition_status": "取得可否未確定",
                           "blocker_reason": f"監査処理エラー: {type(error).__name__}: {error}"[:400],
                           "next_action": "監査処理を再実行"}
            with lock:
                existing[row["code"]] = audited
                completed += 1
                if completed % CHECKPOINT_EVERY == 0:
                    save()
                    print(json.dumps({"completed_this_run": completed, "total_saved": len(existing)}, ensure_ascii=False), flush=True)
    save()
    counts = {}
    for row in existing.values():
        counts[row["investigation_status"]] = counts.get(row["investigation_status"], 0) + 1
    print(json.dumps({"total": len(existing), "statuses": counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
