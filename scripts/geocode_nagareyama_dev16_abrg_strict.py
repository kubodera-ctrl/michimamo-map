#!/usr/bin/env python3
from __future__ import annotations

import json, re, subprocess, time, urllib.parse, urllib.request
from pathlib import Path

SRC = Path('data/aed_dev16_chiba_pages/12220_流山市.json')
OUT = Path('data/aed_dev16_abr_strict')
CODE='12220'; PREF='千葉県'; MUNI='流山市'
SOURCE_URL='https://www.city.nagareyama.chiba.jp/institution/1005119/1015913.html'
LIST_URL='https://www.city.nagareyama.chiba.jp/institution/1005119/index.html'


def clean_addr(value: str) -> str:
    v=' '.join(str(value or '').split())
    v=re.sub(r'^〒\d{3}-\d{4}\s*','',v)
    v=re.sub(r'（.*?）','',v)
    if v.startswith(MUNI): v=PREF+v
    return v.strip()


def geocode(address: str):
    url='http://127.0.0.1:3000/geocode?'+urllib.parse.urlencode({'address':address,'target':'residential','format':'json'})
    try:
        with urllib.request.urlopen(url,timeout=20) as r:
            p=json.loads(r.read().decode('utf-8'))
        return p[0] if p else None
    except Exception:
        return None


def wait_server():
    for _ in range(60):
        try:
            with urllib.request.urlopen('http://127.0.0.1:3000/health',timeout=2) as r:
                if r.status==200:return
        except Exception: time.sleep(1)
    raise RuntimeError('ABR server unhealthy')


def main():
    src=json.loads(SRC.read_text(encoding='utf-8'))
    rows=src['tables'][0]['rows'][1:]
    dbdir=Path('/tmp/abr-12220')
    subprocess.run(['abrg','download','-c',CODE,'-d',str(dbdir),'--silent'],check=True)
    subprocess.run(['abrg','serve','start','-d',str(dbdir)],check=True)
    wait_server()
    accepted=[]; held=[]
    try:
        for idx,row in enumerate(rows,2):
            name=(row[0] if len(row)>0 else '').strip()
            address=clean_addr(row[1] if len(row)>1 else '')
            phone=(row[2] if len(row)>2 else '').strip() or None
            res=geocode(address); r=(res or {}).get('result') or {}
            strict=(r.get('match_level')=='residential_detail' and r.get('coordinate_level')=='residential_detail' and float(r.get('score') or 0)>=0.90 and str(r.get('lg_code') or '')==CODE and not (r.get('others') or []) and r.get('lat') is not None and r.get('lon') is not None)
            item={'row':idx,'name':name,'address':address,'phone':phone,'source_url':SOURCE_URL,'listing_url':LIST_URL,'source_license':'CC BY 4.0'}
            if strict:
                item.update({'latitude':float(r['lat']),'longitude':float(r['lon']),'score':float(r['score']),'match_level':r['match_level'],'coordinate_level':r['coordinate_level'],'lg_code':r['lg_code'],'normalized_address':r.get('output')})
                accepted.append(item)
            else:
                item.update({'reason':'strict_residential_match_failed','score':r.get('score'),'match_level':r.get('match_level'),'coordinate_level':r.get('coordinate_level'),'lg_code':r.get('lg_code'),'others':r.get('others')})
                held.append(item)
    finally:
        subprocess.run(['abrg','serve','stop'],check=False)
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/f'{CODE}_{MUNI}_accepted.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/f'{CODE}_{MUNI}_held.json').write_text(json.dumps(held,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/f'{CODE}_{MUNI}_report.json').write_text(json.dumps({'code':CODE,'prefecture':PREF,'municipality':MUNI,'source_rows':len(rows),'accepted':len(accepted),'held':len(held),'license':'CC BY 4.0','source_url':SOURCE_URL,'policy':'residential_detail only; coordinate_level residential_detail; score>=0.90; lg_code exact; others empty'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(CODE,MUNI,'accepted',len(accepted),'held',len(held),flush=True)

if __name__=='__main__': main()
