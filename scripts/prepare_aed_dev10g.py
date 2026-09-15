"""Replay Hyogo/Nara/Wakayama reviews and independent guarded SQL."""
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path
from import_aed_open_data import read_records
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row
from build_aed_dev10_publication import build
ROOT=Path('data/aed_dev10g')
def norm(s):return re.sub(r'\s+','',unicodedata.normalize('NFKC',str(s or '')))
def main():
    m=json.loads((ROOT/'sources.json').read_text())
    for f,h in m['evidence_hashes'].items():assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h
    baseline=m['production_baseline']
    for s in m['sources']:
        key=s['key'];resource=s['resources'][0];payload=(ROOT/resource['snapshot']).read_bytes()
        assert hashlib.sha256(payload).hexdigest()==resource['sha256']
        records=read_records(payload);assert len(records)==resource['expected_raw']
        geos=[json.loads(l) for l in (ROOT/'arida_geocoded.jsonl').read_text().splitlines()] if key=='arida' else []
        if geos:assert len(geos)==len(records)
        rows=[];excluded=[]
        for i,r in enumerate(records):
            name=str(r.get('名称') or '').strip();address=str(r.get('所在地_連結表記') or r.get('住所') or '').strip()
            if address and not address.startswith(s['prefecture']):address=s['prefecture']+address
            reason=None
            if not name or not address:reason='missing_name_address'
            elif r.get('外部利用不可') not in (None,'','0','なし','無'):reason='external_use_restricted'
            coords=[r.get('経度'),r.get('緯度')]
            if geos:
                g=geos[i];assert g['input']==address
                if g.get('level')!=8 or g.get('lat') is None or g.get('lon') is None:reason='geocoder_below_address_level_8'
                elif g.get('pref')!=s['prefecture'] or g.get('city')!=s['municipality']:reason='geocoder_administrative_mismatch'
                else:coords=[g['lon'],g['lat']]
            if reason:
                excluded.append(dict(row=i+2,name=name,address=address,reason=reason));continue
            remarks=' / '.join(str(r[k]) for k in ['利用可能日時特記事項','備考'] if r.get(k))
            p=dict(name=name,address=address,prefectureName=s['prefecture'],cityName=s['municipality'],placeOfInstallation=r.get('設置位置'),telephoneNumber=r.get('電話番号'),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=remarks)
            row=make_row(p,coords,s,hashlib.sha256(resource['url'].encode()).hexdigest()[:16]);assert row and row['municipality']==s['municipality'],(key,i)
            south,north,west,east=s['review_bounds'];assert south<=row['latitude']<=north and west<=row['longitude']<=east,(key,i)
            if geos:row['geocode_source']='Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）'
            rows.append(row)
        for i,a in enumerate(rows):
            for b in rows[:i]:
                if norm(a['address'])==norm(b['address']):
                    d=111000*math.hypot(a['latitude']-b['latitude'],.82*(a['longitude']-b['longitude']))
                    assert d<=300,(key,a['name'],b['name'],d)
        rows,exact,near=mark_duplicates(rows)
        report=dict(source=s,raw_rows=len(records),review_rows=len(rows),publish_candidates=sum(not r['duplicate_candidate'] for r in rows),exact_duplicates_removed=exact,internal_near_pairs=near,excluded=excluded,excluded_by_reason=dict(Counter(r['reason'] for r in excluded)),holds=[r for r in rows if r['duplicate_candidate']],adjusted=[])
        for suffix,value in [('review',rows),('review_report',report)]:(ROOT/f'{key}_{suffix}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        Path(f'scripts/publish_aed_dev10g_{key}_20260915.sql').write_text(build(s,rows,baseline));baseline+=report['publish_candidates']
        print(key,report['publish_candidates'],'publish',len(report['holds']),'hold',report['excluded_by_reason'],'exact',exact)
    print('Expected public AED',baseline)
if __name__=='__main__':main()
