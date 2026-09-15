-- Reviewed 奈良県 / 安堵町; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:dad848fec1b8c843:6286594a204271e649f0cff1", "facility_type": "aed", "name": "総合センターひびき", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵557-1", "phone": "0743-57-2831", "latitude": 34.608657, "longitude": 135.754139, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "北側事務室", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:a5d5bd3cabf7845b84db701b", "facility_type": "aed", "name": "安堵町役場", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵958", "phone": "0743-57-7004", "latitude": 34.610707, "longitude": 135.757386, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "1階ロビー", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:01ed7721514a7132b8c00271", "facility_type": "aed", "name": "トーク安堵カルチャーセンター", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵879", "phone": "0743-57-1511", "latitude": 34.606488, "longitude": 135.756781, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "1階ロビー", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:31539d45ea999afe5fa50448", "facility_type": "aed", "name": "安堵中央公園体育館", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町窪田628-1", "phone": "0743-57-2281", "latitude": 34.606832, "longitude": 135.754006, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "窓口", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:d61f65fc7add3dc5caa5eda6", "facility_type": "aed", "name": "歴史民俗資料館", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵1322", "phone": "0743-58-4011", "latitude": 34.59757, "longitude": 135.757464, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "窓口", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:c6d1b96de1216d714c7282e1", "facility_type": "aed", "name": "福祉保健センター", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵853", "phone": "0743-57-5090", "latitude": 34.604852, "longitude": 135.758334, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "1階", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:b5837e159758001475e923b1", "facility_type": "aed", "name": "安堵小学校", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵1469-3", "phone": "0743-57-1590", "latitude": 34.60693, "longitude": 135.75462, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "職員室", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:57c38f6ecf35f73ab02fccc2", "facility_type": "aed", "name": "安堵中学校", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町窪田465-1", "phone": "0743-57-2004", "latitude": 34.603116, "longitude": 135.756128, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "職員室", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:e5fbf79ad58b5beba5f7f611", "facility_type": "aed", "name": "安堵こども園", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵785", "phone": "0743-57-2028", "latitude": 34.598533, "longitude": 135.758448, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "窓口", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:a1c92f9d4d5c1ed889fa53e7", "facility_type": "aed", "name": "文化観光館「四弁花」", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵1352-1", "phone": "0743-57-1540", "latitude": 34.604484, "longitude": 135.757539, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "窓口", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:dad848fec1b8c843:ceb52cc9a23e61131d4b86cb", "facility_type": "aed", "name": "安堵町交流館なでしこ", "prefecture": "奈良県", "prefecture_code": "29", "municipality": "安堵町", "address": "奈良県生駒郡安堵町東安堵165-1", "phone": "0743-57-1511", "latitude": 34.617336, "longitude": 135.757714, "source_name": "安堵町 AED設置箇所一覧（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.town.ando.nara.jp/0000002218.html", "source_license": "CC BY 4.0", "source_updated_at": "2021-04-01", "source_date": null, "installation_location": "玄関(施設内)", "availability": "施設の利用可能曜日、開始・終了時間に従う", "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 40636
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 11
     or (select count(distinct source_key) from dev10_batch) <> 11
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 11
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 34.58 and 34.64 or longitude not between 135.73 and 135.79
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '奈良県'
      or municipality is distinct from '安堵町'
      or source_url is distinct from 'https://www.town.ando.nara.jp/0000002218.html')
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
       else '公式AED一覧・CC BY4.0・住所・座標範囲・利用条件・本番重複を確認。公式座標を使用' end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots (source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate) select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> 11
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 40647
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'ando' as batch,11 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
