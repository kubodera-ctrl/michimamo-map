begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:4b26bba6bd0ee29a:328411b645d4bbbd8e3d55b0'::text,'野田市リサイクルセンター'::text,'千葉県野田市目吹331'::text,'04-7126-0405'::text,35.970172::float8,139.906972::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:4e8e0e669f5f8034e1d3abfc'::text,'第二清掃工場'::text,'千葉県野田市船形4236'::text,'04-7127-1500'::text,35.985742::float8,139.881906::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:49d82e885baf7b576a270e12'::text,'中根配水場'::text,'千葉県野田市中根324'::text,'04-7124-5145'::text,35.9452::float8,139.889519::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a27835f739fa2f05a0d04b87'::text,'野田市斎場'::text,'千葉県野田市目吹7-1'::text,'04-7122-3017'::text,35.957408::float8,139.893906::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:60592783bbe5172ebe732abd'::text,'野田市関宿斎場'::text,'千葉県野田市中戸496'::text,'04-7196-3301'::text,36.061::float8,139.796389::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ee0527ba44ef44b8fa26ac57'::text,'農産物直売所ゆめあぐり野田'::text,'千葉県野田市船形280-1'::text,'04-7120-8821'::text,35.978519::float8,139.869053::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:79dc6ba8ddbaf369a869cba1'::text,'こうのとりの里'::text,'千葉県野田市三ツ堀369'::text,'04-7197-1741'::text,35.9349::float8,139.927769::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:45a724658199469086e4f8f0'::text,'木野崎農業構造改善センター'::text,'千葉県野田市木野崎891-1'::text,'04-7138-3573'::text,35.959275::float8,139.916469::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:a87620739ed4f9c527925b9a'::text,'堆肥センター'::text,'千葉県野田市船形5575'::text,'04-7127-5055'::text,35.989447::float8,139.866198::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:6523f500cd88a085caabc4f1'::text,'梅郷駅東口市営自転車等駐輪場'::text,'千葉県野田市山崎1873-7'::text,'04-7121-3196'::text,35.931154::float8,139.892142::float8,NULL::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45783 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>10 or (select count(*) from dev16_v where not dup)<>10 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45793 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12208_noda_26_7aed_compact_05'::text as batch,10 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
