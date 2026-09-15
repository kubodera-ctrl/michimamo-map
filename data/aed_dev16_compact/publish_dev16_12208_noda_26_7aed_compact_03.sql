begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:4b26bba6bd0ee29a:2e4762d286be6273c3ec362d'::text,'第一中学校'::text,'千葉県野田市野田829-1'::text,'04-7122-5524'::text,35.951503::float8,139.867819::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:6f53b96d799194cd1073dd29'::text,'第二中学校'::text,'千葉県野田市中根139'::text,'04-7122-5534'::text,35.939319::float8,139.875258::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:c6c7e1baed7bd3826ba98e1e'::text,'東部中学校'::text,'千葉県野田市目吹1500'::text,'04-7122-3015'::text,35.963592::float8,139.884569::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:9d8d0572b58f279abdb90a49'::text,'南部中学校'::text,'千葉県野田市花井67'::text,'04-7122-2508'::text,35.935722::float8,139.884556::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:cb91a6e21d66c10f6e9bbfef'::text,'北部中学校'::text,'千葉県野田市谷津673'::text,'04-7122-2866'::text,35.976275::float8,139.854422::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:079292d25c796fdb5ce10ef3'::text,'川間中学校'::text,'千葉県野田市中里136-1'::text,'04-7129-4025'::text,35.992672::float8,139.838103::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:5deb54afb651762130dad030'::text,'福田中学校'::text,'千葉県野田市三ツ堀782'::text,'04-7138-1452'::text,35.945497::float8,139.922661::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:8b63d265191f31bb8f521011'::text,'岩名中学校'::text,'千葉県野田市岩名1700'::text,'04-7122-5269'::text,35.967497::float8,139.838644::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a3f9e61f57da7d650d6a5335'::text,'木間ケ瀬中学校'::text,'千葉県野田市木間ケ瀬3393-1'::text,'04-7198-0218'::text,36.025603::float8,139.846433::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:84edec239c056d4a36ef07a6'::text,'二川中学校'::text,'千葉県野田市桐ケ作418'::text,'04-7196-0004'::text,36.046442::float8,139.812519::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:fae5f1669a26a425d7ddc694'::text,'関宿中学校'::text,'千葉県野田市関宿台町2150'::text,'04-7196-0113'::text,36.087981::float8,139.789164::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:2790a014a9bb702462de5bce'::text,'青少年センター'::text,'千葉県野田市柳沢53'::text,'04-7125-2639'::text,35.958267::float8,139.870511::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:6df2a1acdbb4bac73f02cc2b'::text,'勤労青少年ホーム'::text,'千葉県野田市鶴奉5番地の1'::text,'04-7122-4548'::text,35.956623::float8,139.872519::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:c865bf53a1e0f9edf976b0da'::text,'保健センター'::text,'千葉県野田市鶴奉7-4'::text,'04-7125-1188'::text,35.956017::float8,139.874233::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:d8c6aba738f1fce6e0eb8d26'::text,'関宿保健センター'::text,'千葉県野田市東宝珠花260-1'::text,'04-7198-5011'::text,36.025781::float8,139.822128::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:179c648fa8875c280615791f'::text,'あさひセンター(あさひ育成園)'::text,'千葉県野田市鶴奉73'::text,'04-7122-7519'::text,35.956039::float8,139.881425::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:1db5aaf9e470fd7a16a9a166'::text,'こぶし園'::text,'千葉県野田市鶴奉88-1'::text,'04-7124-9291'::text,35.957275::float8,139.880878::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:7aa375da12b1070d15fd03f4'::text,'あおい空'::text,'千葉県野田市鶴奉90'::text,'04-7121-3741'::text,35.957889::float8,139.880269::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:25c6f3611cf3f9bfdb565799'::text,'複合老人ホーム野田市楽寿園'::text,'千葉県野田市鶴奉264'::text,'04-7122-1464'::text,35.959411::float8,139.885047::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a60bc64a37048aae846e8774'::text,'老人福祉センター'::text,'千葉県野田市瀬戸270'::text,'04-7138-2155'::text,35.936239::float8,139.925889::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:366158dffb862418ec5555c6'::text,'中根地域福祉センター'::text,'千葉県野田市中根31-1'::text,'04-7125-0003'::text,35.944769::float8,139.877156::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:3ef25e7daf63563a5307f2c5'::text,'関宿福祉センターやすらぎの郷'::text,'千葉県野田市古布内1944-2'::text,'04-7196-8341'::text,36.051867::float8,139.817483::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:dba4e3c49df89f87a5031fe6'::text,'岩木小学校老人デイサービスセンター'::text,'千葉県野田市岩名二丁目12-1'::text,'04-7129-0137'::text,35.974889::float8,139.838383::float8,NULL::text,NULL::text,true::bool),
('bodik-reviewed:4b26bba6bd0ee29a:669b20758ec08e42112bc7ba'::text,'谷吉会館'::text,'千葉県野田市谷津1145-3'::text,'04-7129-8444'::text,35.988522::float8,139.842714::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:69b5fe57431ff32c03cf242f'::text,'七光台会館'::text,'千葉県野田市七光台242-1'::text,'04-7129-5087'::text,35.982961::float8,139.847453::float8,NULL::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45734 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>24 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45758 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12208_noda_26_7aed_compact_03'::text as batch,24 as inserted,1 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
