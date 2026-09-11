#!/usr/bin/env python3
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright

URLS=[
  "https://data-setagaya.opendata.arcgis.com/search?collection=Dataset&q=AED",
  "https://data-setagaya.opendata.arcgis.com/search?q=AED"
]

async def main():
    out=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        for url in URLS:
            hits=[]
            page=await browser.new_page(viewport={"width":1280,"height":900})
            async def on_response(resp):
                u=resp.url; low=u.lower()
                if any(k in low for k in ["featureserver","mapserver","sharing/rest","api/v3","datasets","search","query?","download"]):
                    try:
                        ctype=resp.headers.get("content-type","")
                        body=""
                        if "json" in ctype or "text" in ctype:
                            body=(await resp.text())[:12000]
                        hits.append({"url":u,"status":resp.status,"content_type":ctype,"body":body})
                    except Exception as e:
                        hits.append({"url":u,"status":resp.status,"error":str(e)})
            page.on("response",on_response)
            await page.goto(url,wait_until="domcontentloaded",timeout=120000)
            await page.wait_for_timeout(20000)
            txt=await page.locator("body").inner_text()
            links=await page.eval_on_selector_all("a","els => els.map(a => ({text:(a.innerText||'').trim(),href:a.href})).filter(x=>/AED|aed/.test(x.text+' '+x.href))")
            out.append({"requested":url,"final_url":page.url,"title":await page.title(),"body_text":txt[:30000],"links":links[:100],"hits":hits})
            await page.close()
        await browser.close()
    Path("data/import_reports/20260912_setagaya_search_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps([{"requested":x["requested"],"final_url":x["final_url"],"links":x["links"],"hit_urls":[h["url"] for h in x["hits"]]} for x in out],ensure_ascii=False)[:60000])

asyncio.run(main())
