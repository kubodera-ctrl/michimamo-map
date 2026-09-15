"""Normalize fetched API and supplemental records; emit review-only SQL batches."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import urllib.request
from import_nationwide_aed import clean, compact, PREFECTURES, mark_duplicates, has_denied_provenance
from import_aed_open_data import read_records, first_value, sql_text


def make_row(p, coords, source, identity):
    if not isinstance(coords,list) or len(coords)<2:
        return None
    lng,lat=coords[:2]
    try: lat,lng=float(lat),float(lng)
    except (ValueError,TypeError): return None
    if 122 <= lat <= 154 and 20 <= lng <= 46:
        lat,lng=lng,lat
    pref=clean(p.get('prefectureName'))
    if not pref:
        municipality=clean(p.get('municipalityName'))
        pref=next((v for v in PREFECTURES if municipality.startswith(v)), '')
    city=clean(p.get('cityName')) or clean(p.get('municipalityName')).removeprefix(pref)
    name,address=clean(p.get('name')),clean(p.get('address'))
    if not city and pref in PREFECTURES and address.startswith(pref):
        match=re.match(r'(.+?市(?!市)|.+?郡.+?[町村]|.+?区)',address.removeprefix(pref))
        city=match.group(1) if match else ''
    restriction=clean(p.get('limitationOfUse')).lower()
    if restriction not in ('','0','false','なし','無'): return None
    if pref not in PREFECTURES or not city or not name or not address or not (20<=lat<=46 and 122<=lng<=154): return None
    if not address.startswith(pref):
        if address.startswith(city): address=pref+address
        elif (clean(p.get('cityName')) and not any(address.startswith(v) for v in PREFECTURES)
              and not re.match(r'.+?市|.+?郡.+?[町村]',address)):
            address=pref+city+address
        else: return None
    install=clean(p.get('placeOfInstallation'))
    digest=hashlib.sha256(f'{name}|{address}|{lat:.7f}|{lng:.7f}|{install}'.encode()).hexdigest()[:24]
    return dict(source_key=f'bodik-reviewed:{identity}:{digest}',facility_type='aed',name=name,prefecture=pref,prefecture_code=PREFECTURES[pref],municipality=city,address=address,phone=clean(p.get('telephoneNumber')) or None,latitude=lat,longitude=lng,source_name=source['source_name'],source_url=source['source_url'],source_license=source['license_id'],source_updated_at=source.get('source_updated_at'),source_date=source.get('source_date'),installation_location=install or None,availability=' / '.join(clean(p.get(k)) for k in ('openingDays','startTime','endTime','openingHoursRemarks') if clean(p.get(k))) or None,quality_status='rough',geocode_source='自治体公式データの座標（表記整形・重複除外）',active=False,duplicate_candidate=False)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--input-dir',type=Path,required=True)
    ap.add_argument('--supplement',type=Path,required=True)
    args=ap.parse_args()
    sources=json.loads((args.input_dir/'sources.json').read_text())
    features=json.loads((args.input_dir/'features.json').read_text())
    rows=[]
    rejected=Counter()
    for feature in features:
        p=feature['properties']; rid=p['resource_id']; source=sources.get(rid,{})
        if not source.get('allowed') or has_denied_provenance(source, {}): rejected['source_not_approved']+=1; continue
        row=make_row(p,(feature.get('geometry') or {}).get('coordinates'),source,rid)
        if row: rows.append(row)
        else: rejected['geometry_identity_or_restriction']+=1
    supplemental=[]
    supplemental_sources=json.loads(args.supplement.read_text())['sources']
    supplemental_source_urls={source['source_url'] for source in supplemental_sources}
    for source in supplemental_sources:
        try:
            if source.get('allowed') is False or has_denied_provenance(source, {}):
                raise ValueError('Source provenance not approved')
            cache=args.input_dir/(hashlib.sha256(source['resource_url'].encode()).hexdigest()+'.bin')
            if cache.exists(): payload=cache.read_bytes()
            else:
                with urllib.request.urlopen(source['resource_url'],timeout=30) as r: payload=r.read()
                cache.write_bytes(payload)
            records=read_records(payload)
            accepted=0
            for p in records:
                p={clean(k).removesuffix(' 必須').removesuffix('必須').strip():v for k,v in p.items()}
                record_pref=first_value(p,('所在地_都道府県','都道府県名'))
                if record_pref and record_pref!=source['prefecture']: continue
                address=first_value(p,('所在地_連結表記','所在地_連結標記','住所','住 所','所在地','設置施設住所','SAFIELD001'))
                # Supplemental manifests are reviewed per municipality. Some official
                # CSVs incorrectly put the full street address in 所在地_市区町村.
                city=source['municipality']
                if not address and city:
                    town=first_value(p,('所在地_町字',))
                    number=first_value(p,('所在地_番地以下',))
                    if town and number:
                        address=source['prefecture']+city+town+number
                ward=first_value(p,('区',))
                if ward and city and not address.startswith((source['prefecture'],city,ward)):
                    address=city+ward+address
                if not city:
                    m=re.match(r'(.+?(?:市|町|村))',address.removeprefix(source['prefecture']))
                    city=m.group(1) if m else ''
                if first_value(p,('市民（外部の方）の使用',)) not in ('','認める'): continue
                mapped={'name':first_value(p,('名称','施設名','施設名称','施設名等','店舗名','SAFIELD000')),'address':address,'prefectureName':source['prefecture'],'cityName':city,'telephoneNumber':first_value(p,('電話番号','電話','連 絡 先','設置場所_電話番号')),'placeOfInstallation':first_value(p,('設置位置','設置場所','設置場所1')),'limitationOfUse':first_value(p,('外部利用不可',))}
                for target,header in (('openingDays','利用可能曜日'),('startTime','開始時間'),('endTime','終了時間'),('openingHoursRemarks','利用可能日時特記事項')):
                    mapped[target]=first_value(p,(header,))
                mapped['openingHoursRemarks']=' / '.join(filter(None,[mapped.get('openingHoursRemarks'),('休業日：'+p['休業日']) if p.get('休業日') else '',p.get('市民が使用する場合の条件')]))
                row=make_row(mapped,[first_value(p,('経度','longitude')),first_value(p,('緯度','latitude'))],source,hashlib.sha256(source['resource_url'].encode()).hexdigest()[:16])
                if row: rows.append(row); accepted+=1
            supplemental.append({'source':source,'raw_rows':len(records),'accepted':accepted,'sha256':hashlib.sha256(payload).hexdigest(),'columns':list(records[0]) if records else []})
        except Exception as error: supplemental.append({'source':source,'error':str(error)})
    rows.sort(key=lambda r:(str(r.get('source_updated_at') or r.get('source_date') or ''),r['source_key']),reverse=True)
    rows,exact,pairs=mark_duplicates(rows)
    (args.input_dir/'review_rows.json').write_text(json.dumps(rows,ensure_ascii=False))
    supplemental_review_rows=[row for row in rows if row['source_url'] in supplemental_source_urls]
    (args.input_dir/'supplemental_review_rows.json').write_text(json.dumps(supplemental_review_rows,ensure_ascii=False))
    report={'rows':len(rows),'by_prefecture':dict(Counter(r['prefecture'] for r in rows)),'rejected':dict(rejected),'exact_removed':exact,'near_duplicate_pairs':pairs,'supplemental_review_rows':len(supplemental_review_rows),'supplemental':supplemental}
    (args.input_dir/'review_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))


if __name__=='__main__': main()
