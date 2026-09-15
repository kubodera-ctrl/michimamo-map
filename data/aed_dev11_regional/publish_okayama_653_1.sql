-- Reviewed 岡山県 / 里庄町; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:6a9240459ce61e96:0104217f0d5b8b6d1aab79f9", "facility_type": "aed", "name": "株式会社サンラヴィアン", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町新庄3920", "phone": "0865-64-4771", "latitude": 34.499903, "longitude": 133.561931, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:76cac631a0b5ae128cdd1fe0", "facility_type": "aed", "name": "浅口郡里庄町立里庄西小学校", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町大字新庄5534番地", "phone": "0865-64-2012", "latitude": 34.5048, "longitude": 133.54539, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:32e3cfa52acb576201e7dcf4", "facility_type": "aed", "name": "里庄町立里庄東小学校", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見6610番地", "phone": "0865-64-2013", "latitude": 34.52078, "longitude": 133.5694, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:aaec771d65ed0c9fa561ab3a", "facility_type": "aed", "name": "里庄町教育委員会", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見1107-2", "phone": "0865-64-7212", "latitude": 34.513588, "longitude": 133.556349, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:e15a1866f844e9e2088ed9c8", "facility_type": "aed", "name": "里庄町立里庄中学校", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見2535", "phone": "0865-64-2004", "latitude": 34.5139, "longitude": 133.55814, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:9f3948608bffb57ec4b01bc9", "facility_type": "aed", "name": "にいつクリニック", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町新庄2929-1", "phone": "0865-64-3622", "latitude": 34.506319, "longitude": 133.550978, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:a1752ab62711a9c0ea90e243", "facility_type": "aed", "name": "里庄町福祉会館", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見1107-2", "phone": "0865-64-7212", "latitude": 34.513588, "longitude": 133.556349, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:297981e116b114ddb4b3ea86", "facility_type": "aed", "name": "天野実業株式会社 里庄第一工場", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見4215", "phone": "0865-64-2089", "latitude": 34.51847, "longitude": 133.57251, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:ba5501cc4ad534468655b317", "facility_type": "aed", "name": "天野実業株式会社 里庄第二工場", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見2751-1", "phone": "0865-64-5810", "latitude": 34.5134, "longitude": 133.5645, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:6a9240459ce61e96:a9bc50a7acc4fc4b9ebe79d2", "facility_type": "aed", "name": "さだかね歯科医院", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "里庄町", "address": "岡山県浅口郡里庄町里見9283-6", "phone": "0865-64-6187", "latitude": 34.533005, "longitude": 133.565299, "source_name": "里庄町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/653", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43425
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 10
     or (select count(distinct source_key) from dev10_batch) <> 10
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 10
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 34.48 and 34.55 or longitude not between 133.53 and 133.59
      or source_license is distinct from 'PDL 1.0'
      or prefecture is distinct from '岡山県'
      or municipality is distinct from '里庄町'
      or source_url is distinct from 'https://www.okayama-opendata.jp/datasets/653')
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
      where p.active and not p.duplicate_candidate) <> 10
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43435
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'okayama_653_1' as batch,10 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
