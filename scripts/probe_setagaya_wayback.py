#!/usr/bin/env python3
import requests, json
from pathlib import Path
paths=[
 "https://www.city.setagaya.lg.jp/documents/3038/aedichiran.pdf",
 "https://www2.city.setagaya.lg.jp/documents/3038/aedichiran.pdf",
 "https://city.setagaya.lg.jp/documents/3038/aedichiran.pdf",
 "http://www.city.setagaya.lg.jp/documents/3038/aedichiran.pdf",
 "https://www.city.setagaya.lg.jp/documents/3038/aedichiran.pdf?20250801",
 "https://www.city.setagaya.lg.jp/documents/3038/aedichiran.pdf?download=1",
]
agents=[
 "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
 "Googlebot/2.1 (+http://www.google.com/bot.html)",
 "bingbot/2.0 (+http://www.bing.com/bingbot.htm)",
]
out=[]
s=requests.Session()
for url in paths:
 for ua in agents:
  try:
   r=s.get(url,headers={"User-Agent":ua,"Referer":"https://www.city.setagaya.lg.jp/opendata/22308.html","Accept":"application/pdf,*/*"},timeout=30,allow_redirects=True)
   out.append({"url":url,"ua":ua.split("/")[0],"status":r.status_code,"final":r.url,"type":r.headers.get("content-type"),"len":len(r.content),"magic":r.content[:20].hex()})
  except Exception as e: out.append({"url":url,"ua":ua.split("/")[0],"error":str(e)})
Path("data/import_reports/20260912_setagaya_pdf_variants.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(out,ensure_ascii=False))
