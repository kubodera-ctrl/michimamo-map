#!/usr/bin/env python3
import json, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path

url="https://www.city.setagaya.lg.jp/opendata/index.php"
h={"User-Agent":"Mozilla/5.0 AppleWebKit/537.36 Chrome/140 Safari/537.36"}
payload={
    "keyword":"AED",
    "data_time_str":"",
    "data_time_end":"",
    "data_upddt_str":"",
    "data_upddt_end":"",
    "cmd_submit":"検索",
    "displayedresults":"all",
}
r=requests.post(url,data=payload,headers=h,timeout=60)
soup=BeautifulSoup(r.text,"html.parser")
text="\n".join(soup.stripped_strings)
links=[]
for a in soup.find_all("a",href=True):
    label=" ".join(a.stripped_strings)
    href=urljoin(r.url,a["href"])
    blob=(label+" "+href).lower()
    if any(k in blob for k in ["aed",".csv",".xlsx",".xls",".zip",".pdf","opendata"]):
        links.append({"text":label[:500],"href":href})
# capture table/list structures around AED hits
contexts=[]
lower=text.lower()
start=0
while True:
    i=lower.find("aed",start)
    if i<0: break
    contexts.append(text[max(0,i-1200):i+4000])
    start=i+3
out={"status":r.status_code,"final_url":r.url,"links":links[:500],"contexts":contexts[:100],"text":text[:100000]}
Path("data/import_reports/20260912_setagaya_catalog_search.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"status":r.status_code,"links":links[:100],"contexts":contexts[:20]},ensure_ascii=False)[:60000])
