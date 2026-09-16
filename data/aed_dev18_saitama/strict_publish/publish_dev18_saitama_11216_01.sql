-- Reviewed 埼玉県 / 羽生市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:b50b76fadc1430ef:f222239fc722da800c708396", "facility_type": "aed", "name": "羽生市民プラザ", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市中央3丁目7-5", "phone": "048-560-3111", "latitude": 36.172940228, "longitude": 139.538932881, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:b334ab112f8aa67a428baea1", "facility_type": "aed", "name": "羽生市男女共同参画推進センター", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市中央3丁目7-5", "phone": "048-561-1681", "latitude": 36.172940228, "longitude": 139.538932881, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:a28d2d81a7eca8f2de7f99f6", "facility_type": "aed", "name": "羽生市中央公民館", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市中央2丁目8-10", "phone": "048-562-1558", "latitude": 36.173584036, "longitude": 139.537394103, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:8b1647e473902175cd674920", "facility_type": "aed", "name": "羽生市立羽生北小学校", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市北2丁目1-1", "phone": "048-561-0058", "latitude": 36.175400558, "longitude": 139.53857016900002, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:0bad8f1f67e526d7512e2b27", "facility_type": "aed", "name": "羽生北学童保育", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市北2丁目1-1", "phone": "048-563-5013", "latitude": 36.175400558, "longitude": 139.53857016900002, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:ae1d7c20228507d680239ff9", "facility_type": "aed", "name": "羽生市第一保育所", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市中央1丁目3-23", "phone": "048-561-3572", "latitude": 36.170819142, "longitude": 139.535803492, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:67c849a89ed0efb5bc4e3f5b", "facility_type": "aed", "name": "羽生市第三保育所", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市北2丁目5-22", "phone": "048-561-1021", "latitude": 36.178252292, "longitude": 139.537068092, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:b50b76fadc1430ef:3d80497e96d951ad78c5c7b9", "facility_type": "aed", "name": "羽生市斎場", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "羽生市", "address": "埼玉県羽生市東3丁目42-2", "phone": "048-561-0436", "latitude": 36.183543356, "longitude": 139.539547869, "source_name": "羽生市 AED設置情報（自治体公式原票・住所詳細レベル照合・まちまもMAP dev18審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/2772", "source_license": "PDL 1.0", "source_updated_at": "2025-11-28", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化・住所詳細レベル8（施設住所の完全一致）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 47001
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 8
     or (select count(distinct source_key) from dev10_batch) <> 8
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 8
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 36.170719141999996 and 36.183643356000005 or longitude not between 139.535703492 and 139.539647869
      or source_license is distinct from 'PDL 1.0'
      or prefecture is distinct from '埼玉県'
      or municipality is distinct from '羽生市'
      or source_url is distinct from 'https://opendata.pref.saitama.lg.jp/datasets/2772')
     then raise exception 'Batch identity/license/coordinate check failed'; end if;
  if exists (select 1 from dev10_batch b join public.safety_spots_nationwide_stage s using(source_key))
     or exists (select 1 from dev10_batch b join public.safety_spots s using(source_key))
     then raise exception 'Previously imported keys found; do not overwrite'; end if;
  if exists (
    select 1 from dev10_batch b join public.safety_spots p
      on p.facility_type='aed' and p.active and not p.duplicate_candidate and p.source_url is distinct from 'https://opendata.pref.saitama.lg.jp/datasets/2772'
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
       else '自治体公式AED原票・PDL 1.0・住所詳細レベル8・自治体一致・重複をdev18で確認' end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate) select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> 8
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 47009
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'dev18_saitama_strict_11216_01' as batch,8 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
