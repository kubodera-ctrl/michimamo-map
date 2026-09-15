#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

OUT=Path('data/aed_dev16_nagareyama')
PAGE='https://www.city.nagareyama.chiba.jp/institution/1005119/1015913.html'
CANDIDATES=[
 ('csv','https://www.city.nagareyama.chiba.jp/_res/projects/default_project/_page_/001/015/913/aed20231017.csv'),
 ('xlsx','https://www.city.nagareyama.chiba.jp/_res/projects/default_project/_page_/001/015/913/aed20231017.xlsx'),
]

def fetch(url):
    req=urllib.request.Request(url,headers={
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
        'Accept':'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*',
        'Referer':PAGE,
    })
    with urllib.request.urlopen(req,timeout=45) as r:
        return r.read(),dict(r.headers.items()),r.geturl()

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={'source_page':PAGE,'license':'CC BY 4.0','attempts':[]}
    for kind,url in CANDIDATES:
        try:
            payload,headers,final=fetch(url)
            (OUT/f'aed.{kind}').write_bytes(payload)
            report['attempts'].append({'kind':kind,'url':url,'status':'downloaded','final_url':final,'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest(),'content_type':headers.get('Content-Type')})
            print(kind,'downloaded',len(payload),flush=True)
        except Exception as e:
            report['attempts'].append({'kind':kind,'url':url,'status':'failed','error':type(e).__name__+': '+str(e)})
            print(kind,'failed',type(e).__name__,e,flush=True)
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__': main()
