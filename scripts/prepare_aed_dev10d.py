"""Replay Yamanashi/Nagano/Gifu reviews and generate independent guarded SQL."""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from import_aed_open_data import read_records
from import_nationwide_aed import mark_duplicates
from prepare_bodik_aed_review import make_row
from build_aed_dev10_publication import build
ROOT = Path('data/aed_dev10d')

def dms(value):
    parts = re.fullmatch(r'(\d+)°(\d+)[′’](\d+(?:\.\d+)?)(?:″|‘’)',str(value).strip())
    assert parts, value
    degree,minute,second = map(float,parts.groups())
    assert 0 <= minute < 60 and 0 <= second < 60
    return degree + minute/60 + second/3600

def main():
    m = json.loads((ROOT/'sources.json').read_text())
    for f,h in m['evidence_hashes'].items(): assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest() == h
    baseline = m['production_baseline']
    for s in m['sources']:
        key = s['key'];rows=[];excluded=[];adjusted=[];raw_count=0
        for resource in s['resources']:
            payload=(ROOT/resource['snapshot']).read_bytes()
            assert hashlib.sha256(payload).hexdigest()==resource['sha256']
            records=read_records(payload);assert len(records)==resource['expected_raw'];raw_count+=len(records)
            geos=[json.loads(l) for l in (ROOT/'wanouchi_geocoded.jsonl').read_text().splitlines()] if key=='wanouchi' else []
            if geos: assert len(geos)==len(records)
            for i,r in enumerate(records):
                name=str(r.get('名称') or '').strip();address=str(r.get('所在地_連結表記') or r.get('住所') or '').strip();location=str(r.get('設置位置') or '').strip();reason=None
                if key=='fuefuki':
                    if not address.startswith('笛吹市'): address='笛吹市'+address
                    address='山梨県'+address
                elif key=='wanouchi': address='岐阜県安八郡'+address
                if not name or not address: reason='missing_name_address'
                elif r.get('外部利用不可') not in (None,'','0','なし','無'): reason='external_use_restricted'
                elif key=='fuefuki' and not location: reason='installation_location_unspecified'
                elif key=='iida' and location=='なし': reason='source_reports_no_installation_position'
                elif key=='iida' and name=='南信濃簡易宿泊施設（島畑）': reason='incomplete_street_address'
                coords=[r.get('経度'),r.get('緯度')]
                if key=='wanouchi':
                    g=geos[i];assert g['input']==address
                    if g.get('level')!=8 or g.get('lat') is None or g.get('lon') is None:reason='geocoder_below_address_level_8'
                    elif g.get('pref')!='岐阜県' or g.get('city') not in ('輪之内町','安八郡輪之内町'):reason='geocoder_administrative_mismatch'
                    else:coords=[g['lon'],g['lat']]
                elif key=='fuefuki' and not reason:coords=[dms(coords[0]),dms(coords[1])]
                if reason:
                    excluded.append(dict(resource=resource['snapshot'],row=i+2,name=name,address=address,reason=reason));continue
                if key=='iida' and name=='飯田市保健センター':
                    assert location=='1階ホール;1階事務室（貸出用）'
                    adjusted.append(dict(name=name,field='installation_location',before=location,after='1階ホール',reason='retain_fixed_hall_device_exclude_portable_loan'))
                    location='1階ホール'
                mapped=dict(name=name,address=address,prefectureName=s['prefecture'],cityName=s['municipality'],placeOfInstallation=location,
                    telephoneNumber=r.get('電話番号'),openingDays=r.get('利用可能曜日'),startTime=r.get('開始時間'),endTime=r.get('終了時間'),openingHoursRemarks=r.get('利用可能日時特記事項'))
                row=make_row(mapped,coords,s,hashlib.sha256(resource['url'].encode()).hexdigest()[:16]);assert row and row['municipality']==s['municipality'],(key,i,row)
                south,north,west,east=s['review_bounds'];assert south<=row['latitude']<=north and west<=row['longitude']<=east,(key,i)
                if key=='wanouchi':row['geocode_source']='Geolonia住所正規化（位置情報レベル8）'
                elif key=='fuefuki':row['geocode_source']='自治体公式の度分秒座標を十進度へ変換'
                rows.append(row)
        rows,exact,near=mark_duplicates(rows)
        report=dict(source=s,raw_rows=raw_count,review_rows=len(rows),publish_candidates=sum(not r['duplicate_candidate'] for r in rows),
            exact_duplicates_removed=exact,internal_near_pairs=near,excluded=excluded,excluded_by_reason=dict(Counter(r['reason'] for r in excluded)),
            holds=[r for r in rows if r['duplicate_candidate']],adjusted=adjusted)
        for suffix,value in [('review',rows),('review_report',report)]: (ROOT/f'{key}_{suffix}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        Path(f'scripts/publish_aed_dev10d_{key}_20260915.sql').write_text(build(s,rows,baseline));baseline+=report['publish_candidates']
        print(key,report['publish_candidates'],'publish',len(report['holds']),'hold',report['excluded_by_reason'])
    print('Expected public AED',baseline)
if __name__=='__main__': main()
