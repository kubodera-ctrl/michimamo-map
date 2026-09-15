-- Reviewed 岡山県 / 早島町; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson$[{"source_key": "bodik-reviewed:92622d7284396a1a:4bdfa01437366a738b0649f9", "facility_type": "aed", "name": "西日本高速道路サービス中国(株)山陽自動車道 早島料金所", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町大字早島2973-1", "phone": "086-483-0771", "latitude": 34.60191, "longitude": 133.8129, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:dde2a3b3bf9c4a498560a342", "facility_type": "aed", "name": "早島町町民総合会館「ゆるびの舎」", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町前潟370-1", "phone": "086-482-4800", "latitude": 34.601395, "longitude": 133.827928, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:c74838966a2c43f36a721f67", "facility_type": "aed", "name": "(株)早島クリーンセンター", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町早島1999-1", "phone": "086-483-0298", "latitude": 34.601008, "longitude": 133.822189, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:bd29a87ac3399cd9af62902f", "facility_type": "aed", "name": "早島役場", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町前潟360-1", "phone": "086-482-0611", "latitude": 34.600806, "longitude": 133.828309, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:01c4fb256392cca61b70c7e1", "facility_type": "aed", "name": "本州四国連絡高速道路(株)岡山管理センター", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町大字早島2985", "phone": "086-483-1100", "latitude": 34.601404, "longitude": 133.813366, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:8d48b5766bd40db94b773e0f", "facility_type": "aed", "name": "株式会社 日本アクセス岡山支店", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町矢尾852", "phone": "086-292-1000", "latitude": 34.618062, "longitude": 133.820751, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:116d56daf8485dec4d301963", "facility_type": "aed", "name": "早島町地域福祉センター", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町前潟249-1", "phone": "086-482-3000", "latitude": 34.600193, "longitude": 133.826252, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:b0f60717c458744e5a75b616", "facility_type": "aed", "name": "早島町立早島中学校", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町 早島2180", "phone": "086-482-0109", "latitude": 34.600803, "longitude": 133.817768, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:4368b58c0838b58c0d86a0b3", "facility_type": "aed", "name": "早島町矢尾グランド・ゴルフ場", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町矢尾357-2", "phone": "086-482-1585", "latitude": 34.622616, "longitude": 133.829576, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:fcacd9aef0af00f3a398f9ed", "facility_type": "aed", "name": "早島町立早島小学校", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町早島1297-1", "phone": "086-482-0063", "latitude": 34.605379, "longitude": 133.827147, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}, {"source_key": "bodik-reviewed:92622d7284396a1a:ec745f4802adeccb75712520", "facility_type": "aed", "name": "玉島信用金庫 早島支店", "prefecture": "岡山県", "prefecture_code": "33", "municipality": "早島町", "address": "岡山県都窪郡早島町早島2020-6", "phone": "086-482-0073", "latitude": 34.600791, "longitude": 133.82165, "source_name": "早島町 AED設置情報（まちまもMAPが表記整形・位置検証）", "source_url": "https://www.okayama-opendata.jp/datasets/651", "source_license": "PDL 1.0", "source_updated_at": "2017-04-04", "source_date": null, "installation_location": null, "availability": null, "quality_status": "rough", "geocode_source": "自治体公式データの座標（表記整形・重複除外）", "active": false, "duplicate_candidate": false}]$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43325
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> 11
     or (select count(distinct source_key) from dev10_batch) <> 11
     or (select count(*) from dev10_batch where not duplicate_candidate) <> 11
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between 34.58 and 34.64 or longitude not between 133.78 and 133.86
      or source_license is distinct from 'PDL 1.0'
      or prefecture is distinct from '岡山県'
      or municipality is distinct from '早島町'
      or source_url is distinct from 'https://www.okayama-opendata.jp/datasets/651')
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
      where p.active and not p.duplicate_candidate) <> 11
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 43336
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select 'okayama_651_1' as batch,11 as inserted,0 as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
