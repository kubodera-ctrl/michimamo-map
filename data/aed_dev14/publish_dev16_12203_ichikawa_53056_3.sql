-- Reviewed 千葉県 / 市川市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:94e08f2821dad479:0d47c39c8ba12a4ee0cd77d7", "facility_type": "aed", "name": "ローソン市川行徳橋店", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "市川市", "address": "千葉県市川市河原7-17", "phone": "(047)356-6702", "latitude": 35.699533, "longitude": 139.921538, "source_name": "市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.ichikawa.lg.jp/page/4744.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-04-01", "source_date": null, "installation_location": "店舗内", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:94e08f2821dad479:b40d18c15ca98cbeb58d2c58", "facility_type": "aed", "name": "ローソン市川大野店", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "市川市", "address": "千葉県市川市大野町2丁目565-1", "phone": "(047)303-1710", "latitude": 35.751752, "longitude": 139.946662, "source_name": "市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.ichikawa.lg.jp/page/4744.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-04-01", "source_date": null, "installation_location": "店舗内", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:94e08f2821dad479:1bb0b0e05c75fb5a735824e5", "facility_type": "aed", "name": "ローソン国府台駅前店", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "市川市", "address": "千葉県市川市市川3丁目26-13-101", "phone": "(047)312-6800", "latitude": 35.736681, "longitude": 139.902397, "source_name": "市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.ichikawa.lg.jp/page/4744.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-04-01", "source_date": null, "installation_location": "店舗内", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:94e08f2821dad479:667576ae6699dfe6e56fb49f", "facility_type": "aed", "name": "ローソン市川東菅野五丁目店", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "市川市", "address": "千葉県市川市東菅野5丁目22-17", "phone": "(047)338-0667", "latitude": 35.736843, "longitude": 139.949994, "source_name": "市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.ichikawa.lg.jp/page/4744.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-04-01", "source_date": null, "installation_location": "店舗内", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45681
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 4
     or (select count(distinct source_key) from dev10_batch) <> 4
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 4
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 35.660792449999995 and 35.7719004 or longitude not between 129.925107 and 139.9738677
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '千葉県'
      or municipality is distinct from '市川市'
      or source_url is distinct from 'https://www.city.ichikawa.lg.jp/page/4744.html')
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
       else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate) select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> 4
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45685
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'dev16_12203_ichikawa_53056_3' as batch,4 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
