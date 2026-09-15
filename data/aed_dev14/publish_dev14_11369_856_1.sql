-- Reviewed 埼玉県 / 東秩父村; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:ef78dd4a47e555ef:aeff2b7912b798be9bd02e74", "facility_type": "aed", "name": "東秩父村役場", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字御堂634", "phone": "0493-82-1221", "latitude": 36.058148, "longitude": 139.194573, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階フロア", "availability": "月~金曜日 / 8:30 / 17:15 / 土・日・祝日は閉庁", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:414227305e5a2093b5531289", "facility_type": "aed", "name": "東秩父村コミュニティセンター「やまなみ」", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字御堂369", "phone": "0493-82-0164", "latitude": 36.051718, "longitude": 139.205131, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階フロア", "availability": "木~火曜日 / 9:00 / 21:30 / 水曜は閉館", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:75f11c2fc59d85d59e7c2ba5", "facility_type": "aed", "name": "東秩父村立城山保育園", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字御堂16-1", "phone": "0493-82-1234", "latitude": 36.050294, "longitude": 139.212244, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階フロア", "availability": "月~金曜日", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:bb1acbc261c3bce9d02a4181", "facility_type": "aed", "name": "東秩父村保健センター", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字坂本1284-1", "phone": "0493-82-1557", "latitude": 36.057759, "longitude": 139.179352, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階フロア", "availability": "月~金曜日 / 8:30 / 17:15 / 土・日・祝日は閉庁", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:ac15e35c3c803dcdf408b137", "facility_type": "aed", "name": "旧西小学校体育館", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字坂本1313", "phone": null, "latitude": 36.056306, "longitude": 139.178479, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "玄関", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:1adbe091d38cc77f0882be88", "facility_type": "aed", "name": "東秩父村立槻川小学校", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字御堂364-1", "phone": "0493-82-1235", "latitude": 36.051352, "longitude": 139.205686, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階職員室", "availability": "月~金曜日 / 土・日・祝日は休校日", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:eceb5c2dbf080ba830d3870f", "facility_type": "aed", "name": "東秩父村立東秩父中学校", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字奥沢150", "phone": "0493-82-1211", "latitude": 36.05584, "longitude": 139.198226, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階職員室", "availability": "月~金曜日 / 土・日・祝日は休校日", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:ef78dd4a47e555ef:d0d85ad2ade01242a269e8f4", "facility_type": "aed", "name": "ふれあい広場管理棟", "prefecture": "埼玉県", "prefecture_code": "11", "municipality": "東秩父村", "address": "埼玉県秩父郡東秩父村大字奥沢", "phone": null, "latitude": 36.054782, "longitude": 139.200777, "source_name": "東秩父村 AED設置情報（自治体公式座標・まちまもMAP審査済み）", "source_url": "https://opendata.pref.saitama.lg.jp/datasets/140", "source_license": "PDL 1.0", "source_updated_at": "2017-02-15", "source_date": null, "installation_location": "1階会議室", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45096
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 8
     or (select count(distinct source_key) from dev10_batch) <> 8
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 8
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 36.050194 and 36.058248000000006 or longitude not between 139.178379 and 139.212344
      or source_license is distinct from 'PDL 1.0'
      or prefecture is distinct from '埼玉県'
      or municipality is distinct from '東秩父村'
      or source_url is distinct from 'https://opendata.pref.saitama.lg.jp/datasets/140')
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
      where p.active and not p.duplicate_candidate) <> 8
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 45104
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'dev14_11369_856_1' as batch,8 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
