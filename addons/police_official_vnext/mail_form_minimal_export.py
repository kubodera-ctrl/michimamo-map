"""One-shot read-only *public export* using the published police web FORM.

No guessed API, credentials, proxy, bulk export, persistent raw data, GitHub
artifacts or DB writes. A visible date picker must bind an exact ONE-DAY
period BEFORE any POST is permitted. Output contains ONLY schema metadata.

The public form itself advertises POST /opendata/download. Clicking its ordinary
submit button requests a CSV attachment. Never log content rows or payloads.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from inspect_mail_export import inspect_bytes

SITE = "https://mail.keishicho.metro.tokyo.lg.jp/opendata/"
DOWNLOAD = "https://mail.keishicho.metro.tokyo.lg.jp/opendata/download"
HOST = "mail.keishicho.metro.tokyo.lg.jp"
STATIC = {"code.jquery.com", "maxcdn.bootstrapcdn.com"}
DAY = dt.date(2026, 10, 20) # Documented covered date, narrow public sample
NEXT = DAY + dt.timedelta(days=1)
MAX_EXPORT_BYTES = 2_000_000


def parse_visible_date(value: str) -> dt.date:
    """Don't guess Unix timestamps, localization or short/ambiguous years."""
    v = str(value or "").strip()
    m = re.fullmatch(r"(20\d\d)[/-](\d{1,2})[/-](\d{1,2})(?:\s+00:00(?::00)?)?", v)
    if not m:
        raise ValueError("unknown datepicker hidden binding format")
    return dt.date(*map(int, m.groups()))


def safe_form_fields(data: str) -> bool:
    """Allow exactly one day, bounded form fields. No user data in the POST."""
    d = parse_qs(data, keep_blank_values=True, strict_parsing=False)
    if not d or set(d) - {"sdate", "edate", "format", "topic", "region", "_token"}:
        return False
    if len(d.get("sdate", [])) != 1 or len(d.get("edate", [])) != 1:
        return False
    try:
        if parse_visible_date(d["sdate"][0]) != DAY or parse_visible_date(d["edate"][0]) != NEXT:
            return False
    except ValueError:
        return False
    if len(d.get("format", [])) != 1 or d["format"][0].lower() not in ("csv", "0"):
        # Actual form option value unknown: fail closed; don't coerce guess.
        return False
    for key in ("topic", "region"):
        if len(d.get(key, [""])) != 1 or len(d.get(key,[""])[0]) > 1000:
            return False
    return True


def verify_hidden_bound_date(form: dict) -> bool:
    try:
        return parse_visible_date(form["sdate"]) == DAY and parse_visible_date(form["edate"]) == NEXT
    except (KeyError, ValueError, TypeError):
        return False


def capture_schema_via_official_ui() -> dict:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
    receipts = {"safe_post_sent": 0, "blocked_post": 0, "foreign_host_denied": 0}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        def route_guard(route):
            req = route.request
            u = urlparse(req.url)
            if req.method == "POST":
                if (req.url == DOWNLOAD and receipts["safe_post_sent"] == 0 and
                        req.post_data and safe_form_fields(req.post_data)):
                    receipts["safe_post_sent"] += 1
                    route.continue_()
                else:
                    receipts["blocked_post"] += 1
                    route.abort()
            elif req.method != "GET" or u.scheme != "https" or u.port not in (None, 443):
                route.abort()
            elif u.hostname == HOST:
                route.continue_()
            elif u.hostname in STATIC and req.resource_type in ("script", "stylesheet") and u.path.endswith((".js", ".css")):
                route.continue_()
            else:
                receipts["foreign_host_denied"] += 1
                route.abort()
        page.route("**/*", route_guard)
        resp = page.goto(SITE, wait_until="domcontentloaded", timeout=35000)
        if not resp or resp.status != 200:
            raise RuntimeError("official form is not available")
        page.wait_for_timeout(2200)
        if page.locator("form").count() != 1:
            raise ValueError("form ambiguous")
        form_contract = page.evaluate("""() => ({
          method: document.querySelector('form').method.toUpperCase(),
          action: document.querySelector('form').action,
          format_options: [...document.querySelector('#format').options].map(o=>({label:o.text,value:o.value})),
        })""")
        if form_contract["method"] != "POST" or form_contract["action"] != DOWNLOAD:
            raise ValueError("official form action changed")
        csv_options = [x for x in form_contract["format_options"] if "CSV" in x["label"]]
        if len(csv_options) != 1 or csv_options[0]["value"].lower() not in ("csv", "0"):
            raise ValueError("CSV form value changed; no submission permitted")
        page.locator("#format").select_option(csv_options[0]["value"])
        page.locator("#daterangepicker").click()
        if page.locator(".daterangepicker:visible").count() != 1:
            raise ValueError("visible official calendar unavailable")
        picker = page.locator(".daterangepicker:visible")
        if picker.locator("input[name=daterangepicker_start]").count() != 1 or picker.locator("input[name=daterangepicker_end]").count() != 1:
            raise ValueError("official calendar inputs changed")
        # Use normal visible mini-calendar controls. Read the library's public
        # display locale format, not an API endpoint or hidden form field.
        fmt = page.evaluate("""() => {
          const $=window.jQuery;const p=$('#daterangepicker').data('daterangepicker');
          return p?.locale?.format||null;
        }""")
        if fmt not in ("YYYY/MM/DD", "YYYY-MM-DD", "MM/DD/YYYY"):
            raise ValueError("unrecognized datepicker locale format")
        fmt_date = lambda value: (value.strftime("%Y/%m/%d") if fmt=="YYYY/MM/DD" else
                                  value.strftime("%Y-%m-%d") if fmt=="YYYY-MM-DD" else value.strftime("%m/%d/%Y"))
        picker.locator("input[name=daterangepicker_start]").fill(fmt_date(DAY))
        picker.locator("input[name=daterangepicker_start]").press("Tab")
        picker.locator("input[name=daterangepicker_end]").fill(fmt_date(NEXT))
        picker.locator("input[name=daterangepicker_end]").press("Tab")
        picker.locator("button.applyBtn").click()
        form_bound = page.evaluate("""() => ({
          sdate:document.querySelector('input[name=sdate]')?.value||'',
          edate:document.querySelector('input[name=edate]')?.value||'',
          format:document.querySelector('#format')?.value||''
        })""")
        if not verify_hidden_bound_date(form_bound):
            # Diagnostic logs only date control strings, NEVER source row values,
            # token/cookie content or document data. Abort before any submit.
            def safe_date_control(v):
                v=str(v or '')[:48]
                return v if re.fullmatch(r'[0-9 /:\-TZ+.]*',v) else '[unknown date control]'
            widget = page.evaluate("""() => {
              const p=window.jQuery?.('#daterangepicker')?.data('daterangepicker');
              return {locale:p?.locale?.format||'',
                start:p?.startDate?.format('YYYY-MM-DD')||'',
                end:p?.endDate?.format('YYYY-MM-DD')||'',
                visible:document.querySelector('#daterangepicker')?.value||''};
            }""")
            hint={k:safe_date_control(v) for k,v in form_bound.items()}
            hint.update({k:safe_date_control(v) for k,v in widget.items()})
            raise ValueError('date binding mismatch BEFORE POST: '+json.dumps(hint,ensure_ascii=False))
        with tempfile.TemporaryDirectory(prefix="police_mail_export_private_") as temp:
            try:
                with page.expect_download(timeout=30000) as download_info:
                    page.locator("form button[type=submit], form input[type=submit]").first.click()
                downloaded = download_info.value
            except PlaywrightTimeoutError as exc:
                raise ValueError("official form did not return a download; no export bytes retained") from exc
            if receipts["safe_post_sent"] != 1 or receipts["blocked_post"]:
                raise ValueError("unsafe or missing form POST; download discarded")
            filename = downloaded.suggested_filename
            if not filename.lower().endswith(".csv"):
                raise ValueError("official download format is not CSV")
            out = Path(temp)/"official_schema_only.csv"
            downloaded.save_as(str(out))
            if out.stat().st_size > MAX_EXPORT_BYTES:
                raise ValueError("unexpectedly large export; delete without processing")
            schema = inspect_bytes(out.read_bytes(), "csv")
        browser.close()
        return {
          "status": "OFFICIAL_MAIL_MINIMAL_UI_EXPORT_SCHEMA_ONLY",
          "official_form":SITE,
          "export_day":DAY.isoformat(),
          "date_to_exclusive":NEXT.isoformat(),
          "schema":schema,
          "post": {"only_public_day_range":True,"sent_count":receipts["safe_post_sent"],"blocked_count":receipts["blocked_post"]},
          "raw_csv_persisted":False,"raw_rows_logged":False,"db_changed":False,
          "stable_source_id_semantics_confirmed":False,
          "correction_and_withdrawal_semantics_confirmed":False,
          "publication_enabled":False
        }


if __name__ == "__main__":
    try:
        print(json.dumps(capture_schema_via_official_ui(), ensure_ascii=False, sort_keys=True))
    except (ValueError, RuntimeError) as exc:
        # A HOLD is a safe result; no blind retries or large-source fallback.
        print(json.dumps({"status":"SAFE_HOLD_NEEDS_FORM_REVIEW","reason":str(exc)[:160],
                          "form_submission_status":"unconfirmed_in_safe_hold","publication_enabled":False,
                          "db_changed":False},ensure_ascii=False,sort_keys=True))
