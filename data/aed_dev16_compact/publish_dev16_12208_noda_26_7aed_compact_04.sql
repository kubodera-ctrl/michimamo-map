begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:4b26bba6bd0ee29a:2dda502fdc6c220d5ba13097'::text,'島会館'::text,'千葉県野田市山崎2549'::text,'04-7122-5170'::text,35.918981::float8,139.898986::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:691e03b11f997da6bbae59a7'::text,'関宿複合センター'::text,'千葉県野田市木間ケ瀬620'::text,'04-7198-3685'::text,36.032192::float8,139.822119::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:00d1a3b7662bcd6d42e68ade'::text,'野田市心身障がい者福祉作業所'::text,'千葉県野田市鶴奉268番地'::text,'04-7125-3322'::text,35.959842::float8,139.88496::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:2fcbc3e021f86c9e249ba30b'::text,'野田市関宿心身障がい者福祉作業所'::text,'千葉県野田市西高野334-1'::text,'04-7196-3818'::text,36.067022::float8,139.795861::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:cafa87c9da32dc2ea8004a8f'::text,'清水保育所'::text,'千葉県野田市清水881'::text,'04-7122-5050'::text,35.956386::float8,139.853489::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:2826b8b26ce5bda6a28de201'::text,'花輪保育所'::text,'千葉県野田市上花輪新町14'::text,'04-7122-1770'::text,35.937878::float8,139.862506::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:3e151c335d88691efbff7810'::text,'中根保育所'::text,'千葉県野田市中根30-1'::text,'04-7122-5741'::text,35.945042::float8,139.877089::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:25ccb22bb13077d47da3caeb'::text,'南部保育所'::text,'千葉県野田市山崎1214'::text,'04-7124-2221'::text,35.929417::float8,139.881919::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a3482ae10d84965b54ffceb7'::text,'北部保育所'::text,'千葉県野田市谷津682-2'::text,'04-7125-4697'::text,35.974347::float8,139.854789::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:bb279150acb80700fff87c89'::text,'尾崎保育所'::text,'千葉県野田市尾崎1714'::text,'04-7129-2009'::text,35.991386::float8,139.829753::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:8ca3d77cd67f0841b0d971e6'::text,'福田保育所'::text,'千葉県野田市木野崎1648-6'::text,'04-7138-0577'::text,35.94935::float8,139.909014::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:e21e3347cd6a0d66decc8665'::text,'木間ケ瀬保育所'::text,'千葉県野田市木間ケ瀬3152-1'::text,'04-7198-3825'::text,36.018992::float8,139.841683::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a07bd9fef39551627d8083ec'::text,'乳児保育所'::text,'千葉県野田市中野台17'::text,'04-7124-2224'::text,35.948719::float8,139.854322::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:f56db2d61433125b02d57ab0'::text,'宮崎学童保育所'::text,'千葉県野田市宮崎62-5'::text,'04-7124-9105'::text,35.9504::float8,139.873619::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:64d8c479d7106dba97cdf513'::text,'二ツ塚学童保育所'::text,'千葉県野田市二ツ塚488'::text,'04-7123-1717'::text,35.938308::float8,139.911011::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:5d7059b666e6e02e965a47fa'::text,'山崎子ども館(山崎学童保育所)'::text,'千葉県野田市山崎2742-5'::text,'04-7121-4030'::text,35.929478::float8,139.899039::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:7e12bc73bb6799e7221704f8'::text,'七光台子ども館(七光台学童保育所)'::text,'千葉県野田市七光台126-2'::text,'04-7127-2166'::text,35.981258::float8,139.849394::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:c4ee146ad5d7594eef33b03f'::text,'東部学童保育所'::text,'千葉県野田市鶴奉269-1'::text,'04-7122-2416'::text,35.959914::float8,139.885219::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:8439f0f8bcdaaacdf2034857'::text,'のだしこども館 supported by kikkoman'::text,'千葉県野田市清水1122-1'::text,'04-7189-7961'::text,35.956951::float8,139.851392::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:575729d55a18ae1fad229468'::text,'消防署'::text,'千葉県野田市宮崎126-2'::text,'04-7124-0119'::text,35.954533::float8,139.873325::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:0b86a5e89681bddd61be8bce'::text,'消防署中央分署'::text,'千葉県野田市中野台172'::text,'04-7122-2321'::text,35.945469::float8,139.859272::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:83e14ad4c8ec68c8ae6599c4'::text,'消防署北分署'::text,'千葉県野田市船形1550-2'::text,'04-7129-3210'::text,35.984319::float8,139.853881::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:cbf9ccac00b975533512cd18'::text,'消防署南分署'::text,'千葉県野田市二ツ塚139-91'::text,'04-7122-0123'::text,35.933183::float8,139.898547::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:5cc887d77d237ad8d790c8d2'::text,'消防署関宿分署'::text,'千葉県野田市東宝珠花435-1'::text,'04-7198-0119'::text,36.021214::float8,139.823975::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:771f2e8c5cd53ae4cde67e2c'::text,'消防署関宿北出張所'::text,'千葉県野田市西高野451-4'::text,'04-7196-8119'::text,36.064772::float8,139.798856::float8,NULL::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45758 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45783 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12208_noda_26_7aed_compact_04'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
