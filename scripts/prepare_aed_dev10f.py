"""Replay separate Shiga/Kyoto/Osaka reviews; preserve zero-addition Kyoto audit."""
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from import_aed_open_data import read_records
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row
from build_aed_dev10_publication import build
ROOT = Path('data/aed_dev10f')
def norm(s):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', str(s or '')))
def main():
    manifest = json.loads((ROOT/'sources.json').read_text())
    for f, h in manifest['evidence_hashes'].items():
        assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest() == h
    existing = json.loads((ROOT/'muko_existing.json').read_text())
    baseline = manifest['production_baseline']
    for source in manifest['sources']:
        key=source['key']; resource=source['resources'][0]
        payload=(ROOT/resource['snapshot']).read_bytes()
        assert hashlib.sha256(payload).hexdigest()==resource['sha256']
        records=read_records(payload,2 if key=='osaka' else 1)
        assert len(records)==resource['expected_raw']
        coordinate_conflicts=set()
        if key=='koka':
            for i,a in enumerate(records):
                for j,b in enumerate(records[:i]):
                    if norm(a.get('住所'))!=norm(b.get('住所')):continue
                    try:
                        distance=111000*math.hypot(float(a['緯度'])-float(b['緯度']),.82*(float(a['経度'])-float(b['経度'])))
                    except (ValueError,TypeError):continue
                    if distance>300:coordinate_conflicts.update([i,j])
        rows=[];excluded=[]
        for i,r in enumerate(records):
            name=str(r.get('名称') or r.get('施設名') or '').strip()
            address=str(r.get('所在地_連結表記') or r.get('住所') or r.get('所在地') or '').strip()
            if address and not address.startswith(source['prefecture']):address=source['prefecture']+address
            location=str(r.get('設置位置') or r.get('設置場所') or '').strip()
            remarks=' / '.join(str(r[k]) for k in ['利用可能日時特記事項','備考'] if r.get(k))
            if key=='koka':remarks=' / '.join(filter(None,[r.get('開館時間'),'休館日：'+str(r['閉館日']) if r.get('閉館日') else '']))
            reason=None;matches=[]
            if not name or not address:reason='missing_name_address'
            elif i in coordinate_conflicts:reason='same_address_coordinates_over_300m_apart_requires_review'
            elif r.get('外部利用不可') not in (None,'','0','なし','無'):reason='external_use_restricted'
            elif key=='osaka' and '消防車両積載' in location:reason='mobile_fire_vehicle_device'
            elif key=='osaka' and '工事' in remarks and '使用不可' in remarks:reason='temporarily_unavailable_during_construction'
            elif key=='osaka' and '宿泊利用者' in remarks:reason='overnight_guest_availability_restriction'
            try:
                if key=='osaka':
                    url=urlparse(r['マップナビおおさかURL']);assert url.hostname=='www.mapnavi.city.osaka.lg.jp'
                    q=parse_qs(url.query)
                    if 'll' in q:lat,lon=map(float,q['ll'][0].split(','))
                    else:lat,lon=float(q['mpy'][0]),float(q['mpx'][0])
                else:lat,lon=float(r['緯度']),float(r['経度'])
                south,north,west,east=source['review_bounds']
                if not (south<=lat<=north and west<=lon<=east):reason=reason or 'coordinate_outside_review_bounds'
            except (ValueError,TypeError,KeyError):reason=reason or 'missing_invalid_coordinate'
            if key=='muko' and not reason:
                matches=[x['source_key'] for x in existing if norm(x['name'])==norm(name) and norm(x['address'])==norm(address)]
                if matches:reason='already_published_name_address'
            if reason:
                excluded.append(dict(row=i+(3 if key=='osaka' else 2),name=name,address=address,reason=reason,existing_keys=matches));continue
            mapped=dict(name=name,address=address,prefectureName=source['prefecture'],cityName=source['municipality'],placeOfInstallation=location,telephoneNumber=r.get('電話番号'),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=remarks)
            row=make_row(mapped,[lon,lat],source,hashlib.sha256(resource['url'].encode()).hexdigest()[:16])
            assert row and row['municipality']==source['municipality'],(key,i)
            if key=='osaka':row['geocode_source']='自治体公式CSVの地図リンク座標（案内位置、施設入口の実測値ではない）'
            rows.append(row)
        rows,exact,near=mark_duplicates(rows)
        report=dict(source=source,raw_rows=len(records),review_rows=len(rows),publish_candidates=sum(not r['duplicate_candidate'] for r in rows),exact_duplicates_removed=exact,internal_near_pairs=near,excluded=excluded,excluded_by_reason=dict(Counter(r['reason'] for r in excluded)),holds=[r for r in rows if r['duplicate_candidate']],adjusted=[])
        for suffix,value in [('review',rows),('review_report',report)]:
            (ROOT/f'{key}_{suffix}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        Path(f'scripts/publish_aed_dev10f_{key}_20260915.sql').write_text(build(source,rows,baseline))
        baseline+=report['publish_candidates']
        print(key,report['publish_candidates'],'publish',len(report['holds']),'hold',report['excluded_by_reason'])
    print('Expected public AED',baseline)
if __name__=='__main__':main()
