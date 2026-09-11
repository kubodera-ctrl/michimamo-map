#!/usr/bin/env python3
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

URL="https://data-setagaya.opendata.arcgis.com/maps/dc02f04286954fd9857df355948d1323"

async def main():
    hits=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={"width":1280,"height":900})
        async def on_response(resp):
            u=resp.url
            low=u.lower()
            if any(k in low for k in ["featureserver","mapserver","sharing/rest","api/v3","datasets","download","geojson","query?"]):
                try:
                    ctype=resp.headers.get("content-type","")
                    body=""
                    if "json" in ctype or "text" in ctype:
                        body=(await resp.text())[:5000]
                    hits.append({"url":u,"status":resp.status,"content_type":ctype,"body":body})
                except Exception as e:
                    hits.append({"url":u,"status":resp.status,"error":str(e)})
        page.on("response", on_response)
        await page.goto(URL, wait_until="domcontentloaded", timeout=120000)
        await page.wait_for_timeout(25000)
        # Try any obvious dataset/preview/download controls after app hydration.
        texts=["AED","ダウンロード","CSV","API","データ"]
        for t in texts:
            try:
                loc=page.get_by_text(t, exact=False)
                n=await loc.count()
                for i in range(min(n,4)):
                    try:
                        await loc.nth(i).click(timeout=2000)
                        await page.wait_for_timeout(3000)
                    except: pass
            except: pass
        await page.wait_for_timeout(10000)
        title=await page.title()
        content=(await page.content())[:20000]
        Path("data/import_reports/20260912_setagaya_network_probe.json").write_text(
            json.dumps({"title":title,"url":page.url,"hits":hits,"html":content},ensure_ascii=False,indent=2)+"\n",
            encoding="utf-8"
        )
        print(json.dumps({"title":title,"url":page.url,"hit_count":len(hits),"urls":[h["url"] for h in hits]},ensure_ascii=False)[:50000])
        await browser.close()

asyncio.run(main())
