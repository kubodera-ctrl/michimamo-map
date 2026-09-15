begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:4b26bba6bd0ee29a:7ba94cd1d2ebbdb4bba44bf0'::text,'西町集会所'::text,'千葉県野田市関宿台町886-1'::text,'04-7196-0995'::text,36.081072::float8,139.790572::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:b40d7b404a3a34ed48e3f7c6'::text,'NPO法人ゆうあんどみい「子育てサロン」'::text,'千葉県野田市中根193'::text,'04-7124-1367'::text,35.94067::float8,139.87863::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:e9478d44d1e377a71c74951c'::text,'野田市船形多世代交流センター'::text,'千葉県野田市船形1173番地の1'::text,'04-7127-0212'::text,35.98635::float8,139.866234::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:0ae41708c8a7f62f484bcd3b'::text,'野田幼稚園'::text,'千葉県野田市野田793-8'::text,'04-7122-2450'::text,35.947992::float8,139.865689::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:386e72ca4853be60bd466805'::text,'関宿中部幼稚園'::text,'千葉県野田市桐ケ作453-1'::text,'04-7196-2324'::text,36.048558::float8,139.810572::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:0d6113d4a7114987f2492735'::text,'中央小学校'::text,'千葉県野田市野田611'::text,'04-7122-2116'::text,35.946531::float8,139.863969::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:4d2bcef7673bcf31cf43c2df'::text,'宮崎小学校'::text,'千葉県野田市宮崎55'::text,'04-7122-2362'::text,35.949233::float8,139.873469::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:0b6fe14d83e8f83b18c17ea0'::text,'東部小学校'::text,'千葉県野田市鶴奉220'::text,'04-7122-3004'::text,35.961781::float8,139.886089::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:8ec4dd263f3de4466953eb21'::text,'南部小学校'::text,'千葉県野田市山崎1503'::text,'04-7122-2509'::text,35.930442::float8,139.885097::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:4cec07f17a8a4ba2e2ee5d54'::text,'北部小学校'::text,'千葉県野田市谷津25-1'::text,'04-7122-2748'::text,35.968467::float8,139.855503::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ef0435080b59ecea928075d4'::text,'川間小学校'::text,'千葉県野田市中里934'::text,'04-7129-4003'::text,35.996644::float8,139.844914::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:56a118626332be94428784c2'::text,'福田第一小学校'::text,'千葉県野田市三ツ堀1372'::text,'04-7138-2109'::text,35.948114::float8,139.919319::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:7ef6eeb752ed5dc51d1001df'::text,'福田第二小学校'::text,'千葉県野田市西三ケ尾988'::text,'04-7138-0355'::text,35.928506::float8,139.922489::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:9073c7f65421594ecac49a80'::text,'清水台小学校'::text,'千葉県野田市清水773'::text,'04-7124-1191'::text,35.953519::float8,139.852::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:486b9c9d1dfe4d97deb708c7'::text,'柳沢小学校'::text,'千葉県野田市柳沢139'::text,'04-7124-6234'::text,35.962808::float8,139.86875::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:743d9b8477771c4e394b924e'::text,'山崎小学校'::text,'千葉県野田市山崎2733'::text,'04-7125-2938'::text,35.928311::float8,139.901275::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:1f2cd55cd6e6eda37bf193c5'::text,'岩木小学校'::text,'千葉県野田市岩名二丁目12-1'::text,'04-7129-5989'::text,35.974889::float8,139.838383::float8,NULL::text,NULL::text,true::bool),
('bodik-reviewed:4b26bba6bd0ee29a:6b94090d0c08e2ea5ef7efb6'::text,'尾崎小学校'::text,'千葉県野田市尾崎1415'::text,'04-7129-8166'::text,35.989747::float8,139.830339::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a1dde3a603cbf821cf0d70fe'::text,'七光台小学校'::text,'千葉県野田市七光台20-1'::text,'04-7127-1712'::text,35.980136::float8,139.853294::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:e082b7d8ded3eaaa8de903fd'::text,'二ツ塚小学校'::text,'千葉県野田市二ツ塚485-2'::text,'04-7138-1677'::text,35.939381::float8,139.910683::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:31153ea414e7e7a58852c7ed'::text,'みずき小学校'::text,'千葉県野田市みずき三丁目2-3'::text,'04-7121-4311'::text,35.920592::float8,139.886467::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ffdd3cf3d5f1a1f701f40cb7'::text,'木間ケ瀬小学校'::text,'千葉県野田市木間ケ瀬3640'::text,'04-7198-0204'::text,36.021544::float8,139.846042::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:d068532f90e99668c99b0ef8'::text,'二川小学校'::text,'千葉県野田市桐ケ作464'::text,'04-7196-0074'::text,36.049581::float8,139.809533::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ba60239b192bb05005b6e005'::text,'関宿小学校'::text,'千葉県野田市関宿台町171'::text,'04-7196-0112'::text,36.086947::float8,139.787325::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:dc9ace5afb82486bd43dfd60'::text,'関宿中央小学校'::text,'千葉県野田市東宝珠花234-1'::text,'04-7198-4321'::text,36.024831::float8,139.822817::float8,NULL::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45710 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>24 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45734 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12208_noda_26_7aed_compact_02'::text as batch,24 as inserted,1 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
