#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT=Path('data/aed_dev14'); OUT=Path('data/aed_dev16_compact')
BASELINE=45381; BATCH=25
SOURCES=[
 ('12203','ichikawa_53056','市川市','https://www.city.ichikawa.lg.jp/page/4744.html','2026-04-01'),
 ('12208','noda_26_7aed','野田市','https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html','2026-07-01'),
]

def q(v):
    if v is None or v=='': return 'NULL::text'
    return "'"+str(v).replace("'","''")+"'::text"

def build(code,rid,city,url,updated,rows,baseline,num):
    vals=[]
    for r in rows:
        vals.append('('+','.join([
            q(r['source_key']),q(r['name']),q(r['address']),q(r.get('phone')),
            repr(float(r['latitude']))+'::float8',repr(float(r['longitude']))+'::float8',
            q(r.get('installation_location')),q(r.get('availability')),
            ('true' if r.get('duplicate_candidate') else 'false')+'::bool'])+')')
    n=sum(not r.get('duplicate_candidate') for r in rows); held=len(rows)-n
    source_name=f'{city} AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'
    key=f'dev16_{code}_{rid}_compact_{num:02d}'
    sql=f"""begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
{',\n'.join(vals)};
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>{baseline} then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>{len(rows)} or (select count(*) from dev16_v where not dup)<>{n} then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県',{q(city)},address,phone,latitude,longitude,{q(source_name)},{q(url)},'CC BY 4.0',{q(updated)}::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県',{q(city)},address,phone,latitude,longitude,{q(source_name)},{q(url)},'CC BY 4.0',{q(updated)}::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>{baseline+n} then raise exception 'post count mismatch'; end if; end $g$;
select {q(key)} as batch,{n} as inserted,{held} as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
"""
    return key,sql,n,held

def main():
    OUT.mkdir(parents=True,exist_ok=True); baseline=BASELINE; idx=[]
    for code,rid,city,url,updated in SOURCES:
        rows=json.loads((ROOT/f'dev16_{code}_{rid}_review.json').read_text(encoding='utf-8'))
        for num,start in enumerate(range(0,len(rows),BATCH),1):
            key,sql,n,held=build(code,rid,city,url,updated,rows[start:start+BATCH],baseline,num)
            fn=f'publish_{key}.sql'; (OUT/fn).write_text(sql,encoding='utf-8')
            idx.append({'key':key,'file':fn,'municipality':city,'baseline':baseline,'inserted':n,'held':held,'sha256':hashlib.sha256(sql.encode()).hexdigest()})
            baseline+=n
    (OUT/'index.json').write_text(json.dumps({'baseline':BASELINE,'batch_size':BATCH,'expected_final':baseline,'batches':idx},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'batches':len(idx),'expected_final':baseline},ensure_ascii=False))
if __name__=='__main__': main()
