#!/usr/bin/env python3
import requests, urllib.parse, json, re
from bs4 import BeautifulSoup
from pathlib import Path

q='site:city.setagaya.lg.jp/documents/3038/aedkunaizeniki.pdf "64" AED'
h={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"}
urls={
 "bing":"https://www.bing.com/search?"+urllib.parse.urlencode({"q":q,"count":10}),
 "google":"https://www.google.com/search?"+urllib.parse.urlencode({"q":q,"num":10}),
 "yahoojp":"https://search.yahoo.co.jp/search?"+urllib.parse.urlencode({"p":q}),
}
out={}
for name,url in urls.items():
    try:
        r=requests.get(url,headers=h,timeout=30,allow_redirects=True)
        soup=BeautifulSoup(r.text,"html.parser")
        out[name]={
          "status":r.status_code,"final_url":r.url,"length":len(r.text),
          "text":"\n".join(soup.stripped_strings)[:20000],
          "html_head":r.text[:3000]
        }
    except Exception as e:
        out[name]={"error":f"{type(e).__name__}: {e}"}
Path("data/import_reports/20260912_searchengine_setagaya_probe.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({k:{"status":v.get("status"),"length":v.get("length"),"text":v.get("text","")[:5000],"error":v.get("error")} for k,v in out.items()},ensure_ascii=False)[:30000])
