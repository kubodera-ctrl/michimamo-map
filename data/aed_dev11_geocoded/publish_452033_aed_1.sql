-- Reviewed 宮崎県 / 延岡市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:d60712d8a2133f9877cf8d9c", "facility_type": "aed", "name": "北川体育館", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市北川町川内名7330番地", "phone": "46-2576", "latitude": 32.693207187, "longitude": 131.690694205, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "玄関ホール", "availability": "8:00~22:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:a3f09d714e899f2470dca466", "facility_type": "aed", "name": "一ヶ岡コミュニティセンター", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市南一ヶ岡2丁目17-1", "phone": "37-8655", "latitude": 32.523022444, "longitude": 131.678115429, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "玄関正面", "availability": "10:00~22:00(月、祝日休館) / 夜間使用の申込みがない場合は17時まで", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:f4ececb849bf77538279bfac", "facility_type": "aed", "name": "恒富南コミュニティセンター", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市緑ヶ丘5丁目1-16", "phone": "28-2700", "latitude": 32.547312778, "longitude": 131.679721873, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "事務室", "availability": "9:30~22:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:497a451f5d163f399df8b421", "facility_type": "aed", "name": "北老人福祉センター", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市山下町1丁目7-9", "phone": "21-6673", "latitude": 32.589040106, "longitude": 131.669124492, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "玄関ホール", "availability": "8:30~17:00(第3日曜日、祝日休館)", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:8fb3af59a09510aa4965f588", "facility_type": "aed", "name": "ビーチの森須美江", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市須美江町1450-2", "phone": "43-0201", "latitude": 32.663573099, "longitude": 131.759808827, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:8827e7a398b81a3aa4b347cc", "facility_type": "aed", "name": "道の駅北浦", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市北浦町古江3337-1", "phone": "45-3811", "latitude": 32.684716955, "longitude": 131.800931917, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "レストラン入口レジ横キャンプ場管理棟", "availability": "11:00~20:00 9:00~17:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:5d6407c3e260107d84b84d2f", "facility_type": "aed", "name": "延岡市斎場(いのちの杜)", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市熊野江町2985", "phone": "43-1155", "latitude": 32.67895171, "longitude": 131.772395955, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "事務所入口", "availability": "8:00~18:00", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:3854823e875344555fea2980", "facility_type": "aed", "name": "道の駅(北川はゆま)", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市北川町長井5751番地1", "phone": "24-6006", "latitude": 32.666023791, "longitude": 131.704396672, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "店内", "availability": "4月~10月8:30~18:00 11月~3月8:30~17:30 / 毎月第3木曜日、12月31日、1月1日", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:geocoded20260915:aa2adf4c9653325f:818f885a6f1b066ef1add746", "facility_type": "aed", "name": "延岡市立図書館北浦分館", "prefecture": "宮崎県", "prefecture_code": "45", "municipality": "延岡市", "address": "宮崎県延岡市北浦町古江1943-1", "phone": "45-2466", "latitude": 32.708990595, "longitude": 131.821702474, "source_name": "延岡市 AED設置情報（まちまもMAPが住所から位置補完）", "source_url": "https://data.bodik.jp/dataset/452033_aed", "source_license": "CC BY 4.0", "source_updated_at": "2020-12-14", "source_date": null, "installation_location": "カウンターそば", "availability": "火~金9:00~19:00 土日祝9:00~17:00 / 月曜日、第一金曜日等休館日あり", "quality_status": "rough", "geocode_source": "Geolonia住所正規化（位置情報レベル8、施設入口の実測値ではない）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43292
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 9
     or (select count(distinct source_key) from dev10_batch) <> 9
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 9
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 32.522922443999995 and 32.709090595000006 or longitude not between 131.669024492 and 131.821802474
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '宮崎県'
      or municipality is distinct from '延岡市'
      or source_url is distinct from 'https://data.bodik.jp/dataset/452033_aed')
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
      where p.active and not p.duplicate_candidate) <> 9
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43301
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select '452033_aed_1' as batch,9 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
