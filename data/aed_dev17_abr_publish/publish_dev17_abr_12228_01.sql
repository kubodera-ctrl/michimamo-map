-- Reviewed 千葉県 / 四街道市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:4c145267ee8453d1:d3034641dacd387327087918", "facility_type": "aed", "name": "四街道保育園", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "四街道市", "address": "千葉県四街道市四街道3-10-9", "phone": "422-2720", "latitude": 35.6588371, "longitude": 140.155936606, "source_name": "四街道市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev17審査済み）", "source_url": "https://opendata.pref.chiba.lg.jp/resources/56525", "source_license": "CC BY 4.0", "source_updated_at": "2026-03-27", "source_date": "2025-04-01", "installation_location": "玄関", "availability": "平日 / 7:00~20:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4c145267ee8453d1:611021e067a1237ddf3bc032", "facility_type": "aed", "name": "めいわクリニック", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "四街道市", "address": "千葉県四街道市めいわ4-3-32", "phone": "433-7717", "latitude": 35.651261131, "longitude": 140.168999633, "source_name": "四街道市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev17審査済み）", "source_url": "https://opendata.pref.chiba.lg.jp/resources/56525", "source_license": "CC BY 4.0", "source_updated_at": "2026-03-27", "source_date": "2025-04-01", "installation_location": "診療室", "availability": "月火水金土(祭日除く) / 9:00~12:00 15:00~18:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4c145267ee8453d1:232516def6651f2010292965", "facility_type": "aed", "name": "千代田公民館", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "四街道市", "address": "千葉県四街道市もねの里3-20-30", "phone": "422-4151", "latitude": 35.690259675, "longitude": 140.192477306, "source_name": "四街道市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev17審査済み）", "source_url": "https://opendata.pref.chiba.lg.jp/resources/56525", "source_license": "CC BY 4.0", "source_updated_at": "2026-03-27", "source_date": "2025-04-01", "installation_location": "1階事務室内受付窓口", "availability": "毎日利用可能 (第4月曜日、年末年始(12/29~1/3)を除く) / 9:00~21:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 46942
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 3
     or (select count(distinct source_key) from dev10_batch) <> 3
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 3
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 35.651161130999995 and 35.690359675 or longitude not between 140.155836606 and 140.192577306
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '千葉県'
      or municipality is distinct from '四街道市'
      or source_url is distinct from 'https://opendata.pref.chiba.lg.jp/resources/56525')
     then raise exception 'Batch identity/license/coordinate check failed'; end if;
  if exists (select 1 from dev10_batch b join public.safety_spots_nationwide_stage s using(source_key))
     or exists (select 1 from dev10_batch b join public.safety_spots s using(source_key))
     then raise exception 'Previously imported keys found; do not overwrite'; end if;
  if exists (
    select 1 from dev10_batch b join public.safety_spots p
      on p.facility_type='aed' and p.active and not p.duplicate_candidate and p.source_url is distinct from 'https://opendata.pref.chiba.lg.jp/resources/56525'
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
       else '自治体公式AED原票・CC BY 4.0・住所詳細レベル・自治体コード・市域・重複をdev17で確認' end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate) select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> 3
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 46945
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'dev17_abr_12228_01' as batch,3 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
