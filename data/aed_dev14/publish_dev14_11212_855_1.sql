-- Reviewed 埼玉県 / 東松山市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:049c2c131b9c4028:952d79c461e28a45f14a87d0", "facility_type": "aed", "name": "東松山市保健センター", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東松山市", "address": "埼玉県東松山市材木町2-36", "phone": "24-3921", "latitude": 36.041887, "longitude": 139.401495, "source_name": "東松山市 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/139", "source_license": "PDL 1.0", "source_updated_at": "2017-03-02", "source_date": null, "installation_location": "1階 相談室", "availability": "月~金曜日 / 08:30 / 17:15", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:049c2c131b9c4028:8e7e8240406146b049306b82", "facility_type": "aed", "name": "東松山市総合福祉センター", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東松山市", "address": "埼玉県東松山市松本町1-7-8", "phone": "23-1251", "latitude": 36.03786, "longitude": 139.407564, "source_name": "東松山市 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/139", "source_license": "PDL 1.0", "source_updated_at": "2017-03-02", "source_date": null, "installation_location": "地域福祉課 事務局", "availability": "毎日 / 08:30 / 17:30", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:049c2c131b9c4028:6c1a98930b376ed4fbd1b678", "facility_type": "aed", "name": "東松山市立市民病院", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東松山市", "address": "埼玉県東松山市松山2392", "phone": "24-6111", "latitude": 36.054131, "longitude": 139.405685, "source_name": "東松山市 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/139", "source_license": "PDL 1.0", "source_updated_at": "2017-03-02", "source_date": null, "installation_location": "1階エントランスホール", "availability": "毎日", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:049c2c131b9c4028:e1d6c2bded15f4b36ba0504e", "facility_type": "aed", "name": "市野川浄化センター", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東松山市", "address": "埼玉県東松山市山崎町22-1", "phone": "24-2022", "latitude": 36.026809, "longitude": 139.42742, "source_name": "東松山市 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/139", "source_license": "PDL 1.0", "source_updated_at": "2017-03-02", "source_date": null, "installation_location": "2階中央操作室", "availability": "毎日", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:049c2c131b9c4028:ed4b7938d22603334f3a91cb", "facility_type": "aed", "name": "東松山市水道庁舎", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東松山市", "address": "埼玉県東松山市下唐子814", "phone": "22-1123", "latitude": 36.023175, "longitude": 139.366133, "source_name": "東松山市 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/139", "source_license": "PDL 1.0", "source_updated_at": "2017-03-02", "source_date": null, "installation_location": "庁舎2階事務室", "availability": "毎日", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 44072
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 5
     or (select count(distinct source_key) from dev10_batch) <> 5
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 5
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 36.023075 and 36.054231 or longitude not between 139.366033 and 139.42752000000002
      or source_license is distinct from 'PDL 1.0'
      or prefecture is distinct from '埼玉県'
      or municipality is distinct from '東松山市'
      or source_url is distinct from 'https://opendata.pref.saitama.lg.jp/datasets/139')
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
       else '自治体公式オープンデータ・公式座標・利用条件・重複を確認' end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate) select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> 5
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 44077
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'dev14_11212_855_1' as batch,5 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
