-- Reviewed 鹿児島県 / 南さつま市; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:fa3c20dccde8ed77:f59c9ec69aa0a81bfe7385f4", "facility_type": "aed", "name": "南さつま市人工芝サッカー場", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市加世田高橋3359", "phone": "(0993)52-0910", "latitude": 31.431757, "longitude": 130.282316, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "クラブハウス内放送室", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:d9cb892a5245aee1315d83bf", "facility_type": "aed", "name": "B☆G BASE ただいま", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市加世田武田17444-1", "phone": "(0993)76-8670", "latitude": 31.409921, "longitude": 130.323542, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "1階玄関", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:7fa0aaadbf560b1e6474cfa7", "facility_type": "aed", "name": "シフトプラス株式会社鹿児島営業所", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市加世田本町41-7", "phone": "050-5358-2990", "latitude": 31.41797, "longitude": 130.32015, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "事務所入口", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:4f04015a7d5f0b55eb2bb0e0", "facility_type": "aed", "name": "社会福祉法人あやの会 加世田セントラル", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市加世田小湊231", "phone": "(0993)76-1122", "latitude": 31.42174, "longitude": 130.2882, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "事務所", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:bc5cdba9ab8eeb91afc40c91", "facility_type": "aed", "name": "社会福祉法人あやの会 笠沙セントラル", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市笠沙町片浦2320-35", "phone": "(0993)63-0023", "latitude": 31.40801, "longitude": 130.18689, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "事務所", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:6272c555f6fcbacb9b1a4e07", "facility_type": "aed", "name": "田布施地区公民館", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市金峰町尾下450", "phone": "(0993)77-2009", "latitude": 31.46157, "longitude": 130.34442, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "1階受付", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:9557e2516082bec1b90de309", "facility_type": "aed", "name": "観光物産交流施設きやったもんせ南さつま", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市加世田本町43-9", "phone": "(0993)53-3751", "latitude": 31.41848, "longitude": 130.31958, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "1階レジ", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:a36dcccd4f3cd090d94d0d85", "facility_type": "aed", "name": "鹿児島日産自動車(株)加世田店", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市加世田本町52-6", "phone": "(0993)52-8823", "latitude": 31.4159, "longitude": 130.32107, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "ショールーム", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:fa3c20dccde8ed77:a80a871375fe89fdc8c46f2f", "facility_type": "aed", "name": "南さつま市笠沙支所", "prefecture": "鹿児島県", "prefecture_code": "46", "municipality": "南さつま市", "address": "鹿児島県南さつま市笠沙町808番地", "phone": "(0993)63-1111", "latitude": 31.406821, "longitude": 130.191126, "source_name": "南さつま市 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://data.bodik.jp/dataset/462209_aed", "source_license": "CC BY 4.0", "source_updated_at": "2026-09-08", "source_date": null, "installation_location": "玄関", "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 42845
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 9
     or (select count(distinct source_key) from dev10_batch) <> 9
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 9
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 31.2 and 31.6 or longitude not between 130.1 and 130.5
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from '鹿児島県'
      or municipality is distinct from '南さつま市'
      or source_url is distinct from 'https://data.bodik.jp/dataset/462209_aed')
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
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 42854
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select '462209_aed_2' as batch,9 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
