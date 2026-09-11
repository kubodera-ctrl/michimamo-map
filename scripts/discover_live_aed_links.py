#!/usr/bin/env python3
import json, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path

pages={
"北区":"https://www.city.kita.lg.jp/city-information/disclosure/1014461.html",
"板橋区":"https://www.city.itabashi.tokyo.jp/kusei/joho/1035613/1035617.html",
"世田谷区":"https://www.city.setagaya.lg.jp/opendata/22308.html",
"足立区":"https://www.city.adachi.tokyo.jp/bosai/aed.html",
"葛飾区":"https://www2.city.katsushika.lg.jp/kurashi/1004028/1004040/1004904.html",
}
headers={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
out={}
for ward,url in pages.items():
    try:
        r=requests.get(url,headers=headers,timeout=30)
        rec={"status":r.status_code,"final_url":r.url,"links":[]}
        soup=BeautifulSoup(r.text,"html.parser")
        for a in soup.find_all("a",href=True):
            text=" ".join(a.stripped_strings)
            href=urljoin(r.url,a["href"])
            low=(text+" "+href).lower()
            if any(k in low for k in ["aed",".csv",".xlsx",".xls",".pdf",".zip","arcgis"]):
                rec["links"].append({"text":text[:300],"href":href})
        out[ward]=rec
    except Exception as e:
        out[ward]={"error":f"{type(e).__name__}: {e}"}
Path("data/import_reports/20260912_remaining_live_links.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps(out,ensure_ascii=False)[:50000])
