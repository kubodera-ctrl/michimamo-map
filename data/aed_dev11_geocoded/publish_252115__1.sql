-- Reviewed 滋賀県 / 湖南市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:geocoded20260915:d5a4e42671d4faa9:71b60e3009a377c158fde0d8", "facility_type": "aed", "name": "石部診療所", "prefecture": "滋賀県", "prefecture_code": "25", "municipality": "湖南市", "address": "滋賀県湖南市石部東五丁目3番1号", "phone": "0748-72-4100", "latitude": 35.00334432, "longitude": 136.063806407, "source_name": "湖南市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/252115_", "source_license": "CC BY 4.0", "source_updated_at": "2024-10-17", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:d5a4e42671d4faa9:8f20588a561200e866479378", "facility_type": "aed", "name": "岩根小学校", "prefecture": "滋賀県", "prefecture_code": "25", "municipality": "湖南市", "address": "滋賀県湖南市岩根3791番地", "phone": "0748-72-1500", "latitude": 35.006167076, "longitude": 136.09798788, "source_name": "湖南市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/252115_", "source_license": "CC BY 4.0", "source_updated_at": "2024-10-17", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:d5a4e42671d4faa9:82cbfe297122ee899dbd41c9", "facility_type": "aed", "name": "菩提寺北学童保育所 わんぱくクラブ", "prefecture": "滋賀県", "prefecture_code": "25", "municipality": "湖南市", "address": "滋賀県湖南市サイドタウン二丁目4番31号", "phone": "0748-74-3219", "latitude": 35.045203936, "longitude": 136.064832916, "source_name": "湖南市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/252115_", "source_license": "CC BY 4.0", "source_updated_at": "2024-10-17", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:d5a4e42671d4faa9:233892a5914d7dedcab6cce1", "facility_type": "aed", "name": "岩根学童保育所 はねっこクラブ", "prefecture": "滋賀県", "prefecture_code": "25", "municipality": "湖南市", "address": "滋賀県湖南市岩根3781番地1", "phone": "0748-72-9034", "latitude": 35.006124706, "longitude": 136.098884948, "source_name": "湖南市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/252115_", "source_license": "CC BY 4.0", "source_updated_at": "2024-10-17", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:d5a4e42671d4faa9:29137f9dea3136c1ce0f6438", "facility_type": "aed", "name": "石部保育園", "prefecture": "滋賀県", "prefecture_code": "25", "municipality": "湖南市", "address": "滋賀県湖南市石部中央三丁目9番20号", "phone": "0748-76-3693", "latitude": 35.008926871, "longitude": 136.054009823, "source_name": "湖南市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/252115_", "source_license": "CC BY 4.0", "source_updated_at": "2024-10-17", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43053
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 5
     or (select count(distinct source_key) from dev10_batch) <> 5
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 5
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 35.00324431999999 and 35.045303936 or longitude not between 136.053909823 and 136.098984948
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '滋賀県'
      or municipality is distinct from '湖南市'
      or source_url is distinct from 'https://data.bodik.jp/dataset/252115_')
     then raise exception 'Batch identity/license/coordinate check failed'; end if;
  if exists (select 1 from dev10_batch b join public.safety_spots_nationwide_stage s using(source_key))
     or exists (select 1 from dev10_batch b join public.safety_spots s using(source_key))
     then raise exception 'Previously imported keys found; do not overwrite'; end if;
  if exists (
    select 1 from dev10_batch b join public.safety_spots p
      on p.facility_type='aed' and p.active and not p.duplicate_candidate
    cross join lateral (select
      regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,
      regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn) n
    where not b.duplicate_candidate and (
      (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g'))
      or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002
          and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3
              and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))))
     then raise exception 'Public exact/near duplicate candidate; review before publishing'; end if;
end;
$guard$;
insert into public.safety_spots_nationwide_stage (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,case when duplicate_candidate then 'hold' else 'published' end,
  case when duplicate_candidate then '同一施設の近接名称候補。設置位置の区別を要確認'
       else '自治体公式CSV・CC BY 4.0・公式座標・本番重複照合を確認' end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate) select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> 5
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43058
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select '252115__1' as batch,5 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
