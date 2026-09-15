-- Reviewed 千葉県 / 野田市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:4b26bba6bd0ee29a:328411b645d4bbbd8e3d55b0", "facility_type": "aed", "name": "野田市リサイクルセンター", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市目吹331", "phone": "04-7126-0405", "latitude": 35.970172, "longitude": 139.906972, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:4e8e0e669f5f8034e1d3abfc", "facility_type": "aed", "name": "第二清掃工場", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市船形4236", "phone": "04-7127-1500", "latitude": 35.985742, "longitude": 139.881906, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:49d82e885baf7b576a270e12", "facility_type": "aed", "name": "中根配水場", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市中根324", "phone": "04-7124-5145", "latitude": 35.9452, "longitude": 139.889519, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:a27835f739fa2f05a0d04b87", "facility_type": "aed", "name": "野田市斎場", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市目吹7-1", "phone": "04-7122-3017", "latitude": 35.957408, "longitude": 139.893906, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:60592783bbe5172ebe732abd", "facility_type": "aed", "name": "野田市関宿斎場", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市中戸496", "phone": "04-7196-3301", "latitude": 36.061, "longitude": 139.796389, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:ee0527ba44ef44b8fa26ac57", "facility_type": "aed", "name": "農産物直売所ゆめあぐり野田", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市船形280-1", "phone": "04-7120-8821", "latitude": 35.978519, "longitude": 139.869053, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:79dc6ba8ddbaf369a869cba1", "facility_type": "aed", "name": "こうのとりの里", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市三ツ堀369", "phone": "04-7197-1741", "latitude": 35.9349, "longitude": 139.927769, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:45a724658199469086e4f8f0", "facility_type": "aed", "name": "木野崎農業構造改善センター", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市木野崎891-1", "phone": "04-7138-3573", "latitude": 35.959275, "longitude": 139.916469, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:a87620739ed4f9c527925b9a", "facility_type": "aed", "name": "堆肥センター", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市船形5575", "phone": "04-7127-5055", "latitude": 35.989447, "longitude": 139.866198, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:4b26bba6bd0ee29a:6523f500cd88a085caabc4f1", "facility_type": "aed", "name": "梅郷駅東口市営自転車等駐輪場", "prefecture": "千葉県", "prefecture_code": "12", "municipality": "野田市", "address": "千葉県野田市山崎1873-7", "phone": "04-7121-3196", "latitude": 35.931154, "longitude": 139.892142, "source_name": "野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）", "source_url": "https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html", "source_license": "CC BY 4.0", "source_updated_at": "2026-07-01", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45783
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 10
     or (select count(distinct source_key) from dev10_batch) <> 10
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 10
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 35.918881 and 36.091283000000004 or longitude not between 139.785683 and 139.92786900000002
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '千葉県'
      or municipality is distinct from '野田市'
      or source_url is distinct from 'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html')
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
      where p.active and not p.duplicate_candidate) <> 10
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45793
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'dev16_12208_noda_26_7aed_small_06' as batch,10 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
