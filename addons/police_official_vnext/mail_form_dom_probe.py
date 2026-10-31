"""Public web-form DOM diagnostic for mail-keishicho Open DATA (read-only).

NO form submission, download, undocumented endpoints, credentials, database writes,
or incident record extraction. Run only in an ephemeral GitHub Actions runner.
The browser loads GET requests for this official site's host only; all other
hosts and non-GET requests are blocked. The output is bounded control metadata.
"""
from __future__ import annotations

import json
import re
from urllib.parse import urlparse

PUBLIC_URL = "https://mail.keishicho.metro.tokyo.lg.jp/opendata/"
HOST = "mail.keishicho.metro.tokyo.lg.jp"


def clean_control_text(value: object, limit: int = 100) -> str:
    """Return public, display-only form labels; never raw HTML or inputs' values."""
    s = re.sub(r"\s+", " ", str(value or "")).strip()
    s = re.sub(r"[\x00-\x1f\x7f]", "", s)
    return s.strip()[:limit]


def safe_control_name(value: object) -> str:
    s = clean_control_text(value, 75)
    if re.search(r"(?:csrf|pass|token|session|cookie|secret|key|auth)", s, re.I):
        return "[redacted-control-name]"
    return s


def browser_probe() -> dict:
    from playwright.sync_api import sync_playwright
    denied = {"foreign_host": 0, "non_get": 0}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox"])
        context = browser.new_context(accept_downloads=False)
        page = context.new_page()

        def strict_route(route):
            req = route.request
            parsed = urlparse(req.url)
            if req.method != "GET":
                denied["non_get"] += 1
                route.abort()
            elif parsed.scheme != "https" or parsed.hostname != HOST or parsed.port not in (None, 443):
                denied["foreign_host"] += 1
                route.abort()
            else:
                route.continue_()

        page.route("**/*", strict_route)
        response = page.goto(PUBLIC_URL, wait_until="domcontentloaded", timeout=35000)
        if not response or response.status != 200:
            raise RuntimeError("Official public page did not load normally")
        page.wait_for_timeout(3500)  # allow ordinary UI rendering; no clicks
        raw = page.evaluate("""() => {
          const trim = value => String(value || '').replace(/\\s+/g,' ').trim().slice(0,100);
          const labelFor = el => {
            const id = el.id || '';
            const attached = id ? [...document.querySelectorAll('label[for]')].find(x=>x.getAttribute('for')===id) : null;
            return trim(el.closest('label')?.innerText || attached?.innerText || el.getAttribute('aria-label') || '');
          };
          return {
            title: document.title.slice(0,120),
            forms: document.querySelectorAll('form').length,
            selects: [...document.querySelectorAll('select')].slice(0,30).map(el=>({
              id:el.id,name:el.name,label:labelFor(el),
              options:[...el.options].slice(0,45).map(o=>({label:trim(o.textContent)})),
              option_count:el.options.length
            })),
            inputs: [...document.querySelectorAll('input')].slice(0,70).map(el=>({
              type:el.type, id:el.id, name:el.name,label:labelFor(el),
              placeholder:trim(el.placeholder), disabled:el.disabled, readOnly:el.readOnly
            })),
            buttons: [...document.querySelectorAll('button,input[type=submit],input[type=button]')].slice(0,45).map(el=>({
              type:el.type, label:trim(el.innerText || el.getAttribute('aria-label') || el.getAttribute('value'))
            })),
            date_inputs: document.querySelectorAll('input[type=date]').length,
            downloaded_files:0
          }
        }""")
        browser.close()
    if "メールけいしちょう" not in raw["title"]:
        raise RuntimeError("Official title mismatch")
    if not raw["selects"] and not raw["inputs"] and not raw["buttons"]:
        raise RuntimeError("No public output controls observed")
    for typ in ("selects", "inputs"):
        for item in raw[typ]:
            item["id"] = safe_control_name(item.get("id"))
            item["name"] = safe_control_name(item.get("name"))
            item["label"] = clean_control_text(item.get("label"))
    for group in ("selects",):
        for item in raw[group]:
            for option in item["options"]:
                option["label"] = clean_control_text(option.get("label"))
    for item in raw["buttons"]:
        item["label"] = clean_control_text(item.get("label"))
    return {
        "status": "OFFICIAL_FORM_DOM_READ_ONLY_NOT_EXPORT",
        "source": PUBLIC_URL,
        "document": raw,
        "request_guard": {"same_origin_GET_only": True, **denied},
        "form_submitted": False,
        "download_attempted": False,
        "credential_use": False,
        "row_data_collected": False,
        "stable_record_id_verified": False,
        "correction_contract_verified": False,
        "publication_allowed": False,
        "production_changed": False,
    }


if __name__ == "__main__":
    print(json.dumps(browser_probe(), ensure_ascii=False, sort_keys=True))
