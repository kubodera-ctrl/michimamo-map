"""Geocode address-only official AED rows, retaining only parcel/address-level matches."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import subprocess

from import_aed_open_data import first_value, read_records
from import_nationwide_aed import clean, fetch_bytes, PREFECTURES, mark_duplicates
from prepare_bodik_aed_review import make_row

NAME_FIELDS = ('名称','施設名','施設名称','施設名等')
ADDRESS_FIELDS = ('所在地_連結表記','所在地_連結標記','住所','所在地','設置施設住所')
CITY_FIELDS = ('所在地_市区町村','市区町村','市区町村名')

def municipality_matches(geocoded_city, municipality):
    geocoded_city=clean(geocoded_city); municipality=clean(municipality)
    return bool(
        geocoded_city == municipality
        or geocoded_city.startswith(municipality)
        or ('郡' in geocoded_city and geocoded_city.endswith(municipality))
    )

def candidates(input_dir, supplement):
    result=[]
    for source in supplement['sources']:
        cache=input_dir/(hashlib.sha256(source['resource_url'].encode()).hexdigest()+'.bin')
        if not cache.exists(): cache.write_bytes(fetch_bytes(source['resource_url']))
        try: records=read_records(cache.read_bytes(),int(source.get('header_row',1)))
        except Exception: continue
        for raw in records:
            p={clean(k).removesuffix(' 必須').removesuffix('必須').strip():v for k,v in raw.items()}
            restriction=clean(first_value(p,('外部利用不可',))).lower()
            if restriction and restriction not in ('0','false','なし','無'):
                continue
            lat=first_value(p,('緯度',)); lng=first_value(p,('経度',))
            try:
                lat_value, lng_value = float(lat), float(lng)
                if ((20 <= lat_value <= 46 and 122 <= lng_value <= 154)
                        or (122 <= lat_value <= 154 and 20 <= lng_value <= 46)):
                    continue
            except (ValueError,TypeError): pass
            name=first_value(p,NAME_FIELDS)
            if source.get('address_join_fields'):
                address=''.join(first_value(p,(field,)) for field in source['address_join_fields'])
            else:
                address=first_value(p,ADDRESS_FIELDS)
            city=source.get('municipality','') or first_value(p,CITY_FIELDS)
            pref=source['prefecture']
            if not city and address.startswith(pref):
                city=next((address[len(pref):i+1] for i,c in enumerate(address[len(pref):],len(pref)) if c in '市区町村'), '')
            if not name or not address or not city: continue
            if not address.startswith(pref):
                address=pref+address if address.startswith(city) else pref+city+address
            mapped={'name':name,'address':address,'prefectureName':pref,'cityName':city,
                    'telephoneNumber':first_value(p,('電話番号','電話','設置場所_電話番号')),
                    'placeOfInstallation':first_value(p,('設置位置','設置場所')),
                    'limitationOfUse':first_value(p,('外部利用不可',)),
                    'openingDays':first_value(p,('利用可能曜日',)),'startTime':first_value(p,('開始時間',)),
                    'endTime':first_value(p,('終了時間',)),'openingHoursRemarks':first_value(p,('利用可能日時特記事項',))}
            result.append((source,mapped))
    return result

def geocode(addresses):
    proc=subprocess.run(['node','scripts/geocode_with_geolonia.mjs'],input='\n'.join(addresses)+'\n',
                        text=True,capture_output=True,timeout=3600)
    if proc.returncode: raise RuntimeError(proc.stderr[-2000:])
    return [json.loads(x) for x in proc.stdout.splitlines() if x.strip()]

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--input-dir',type=Path,required=True)
    ap.add_argument('--supplement',type=Path,required=True);ap.add_argument('--output-dir',type=Path,required=True)
    args=ap.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
    items=candidates(args.input_dir,json.loads(args.supplement.read_text()))
    geos=geocode([x[1]['address'] for x in items])
    rows=[]; rejected=Counter()
    for (source,p),geo in zip(items,geos):
        if geo.get('error') or geo.get('level') != 8 or geo.get('lat') is None or geo.get('lon') is None:
            rejected['not_address_level']+=1;continue
        if clean(geo.get('pref')) != source['prefecture'] or not municipality_matches(geo.get('city'),p['cityName']):
            rejected['administrative_mismatch']+=1;continue
        identity='geocoded20260914:'+hashlib.sha256(source['resource_url'].encode()).hexdigest()[:16]
        row=make_row(p,[geo['lon'],geo['lat']],source,identity)
        if not row: rejected['normalization_rejected']+=1;continue
        row['geocode_source']='Geolonia住所正規化（位置情報レベル8）'
        row['quality_status']='review'
        rows.append(row)
    rows,exact,pairs=mark_duplicates(rows)
    report={'candidates':len(items),'geocoded_rows':len(rows),'rejected':dict(rejected),
            'exact_removed':exact,'near_duplicate_pairs':pairs,
            'publishable_before_production_reconciliation':sum(not r['duplicate_candidate'] for r in rows),
            'by_prefecture':dict(Counter(r['prefecture'] for r in rows if not r['duplicate_candidate']))}
    (args.output_dir/'review_rows.json').write_text(json.dumps(rows,ensure_ascii=False))
    (args.output_dir/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__': main()
