begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:4b26bba6bd0ee29a:4b861839328ec23f65484daa'::text,'市役所(1階及び8階)'::text,'千葉県野田市鶴奉7-1'::text,'04-7125-1111'::text,35.954986::float8,139.874517::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:635b3c4a926da36b9fd371c0'::text,'いちいのホール'::text,'千葉県野田市東宝珠花237-1'::text,'04-7198-1111'::text,36.025736::float8,139.820672::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:db49a0e88200bc0386511385'::text,'欅のホール'::text,'千葉県野田市中野台168-1'::text,'04-7123-7818'::text,35.945958::float8,139.858886::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ca969fed841a046a3ef42fe3'::text,'南コミュニティセンター'::text,'千葉県野田市山崎2008'::text,'04-7125-7991'::text,35.930828::float8,139.896569::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:58332907427c9db097d00748'::text,'北コミュニティセンター'::text,'千葉県野田市春日町16-1'::text,'04-7129-8822'::text,35.978819::float8,139.841::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:77ca046015c19dee02778acf'::text,'総合公園体育館'::text,'千葉県野田市清水958'::text,'04-7125-1155'::text,35.962447::float8,139.850928::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:afac4338aed88cf19522ac18'::text,'総合公園陸上競技場'::text,'千葉県野田市清水501'::text,'04-7124-8464'::text,35.960706::float8,139.853275::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:8946ea7170fda936a83dde7e'::text,'関宿総合公園体育館(関宿パークMOPS)'::text,'千葉県野田市平井401'::text,'04-7198-8500'::text,36.018881::float8,139.825144::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:070c34073feeefe2a2db1327'::text,'福田体育館'::text,'千葉県野田市瀬戸970-4'::text,'04-7138-2407'::text,35.944661::float8,139.921314::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:8e1ee946e8c2f04c26ebb8ec'::text,'野田市春風館道場'::text,'千葉県野田市野田376-1'::text,'04-7125-1212'::text,35.944717::float8,139.865564::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ac4f8128d3ecc7345fc592c8'::text,'文化会館(野田ガスホール)'::text,'千葉県野田市鶴奉5-1'::text,'04-7124-1555'::text,35.956647::float8,139.874047::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:5dca921dbfc46e326493276e'::text,'中央公民館'::text,'千葉県野田市鶴奉5-1'::text,'04-7124-1558'::text,35.956431::float8,139.873467::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:ceb709cb88fcef1e73878ebc'::text,'東部公民館'::text,'千葉県野田市鶴奉174-4'::text,'04-7122-4202'::text,35.962206::float8,139.881233::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:f27bfd5cee1daa228b4d84ab'::text,'南部梅郷公民館'::text,'千葉県野田市山崎1154-1'::text,'04-7122-5402'::text,35.929886::float8,139.887019::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:d825daf09cb7fd8d68cd527c'::text,'北部公民館'::text,'千葉県野田市谷津384'::text,'04-7122-3429'::text,35.968578::float8,139.853111::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:3392ffaeba5a1a6c5759c290'::text,'川間公民館'::text,'千葉県野田市中里720'::text,'04-7129-4002'::text,35.995447::float8,139.843397::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:76f48c036a6417dd0af635d5'::text,'福田公民館'::text,'千葉県野田市瀬戸970-1'::text,'04-7138-2407'::text,35.944931::float8,139.921406::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:69555b51e2c17a1c6da7e31d'::text,'関宿中央公民館'::text,'千葉県野田市東宝珠花253-1'::text,'04-7198-2166'::text,36.024972::float8,139.821539::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:7bbe2c2ffc9507d0c5536905'::text,'関宿公民館'::text,'千葉県野田市関宿台町2558-1'::text,'04-7196-1100'::text,36.088883::float8,139.788981::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:93d62b045436349e8039591d'::text,'二川公民館'::text,'千葉県野田市桐ケ作51-1'::text,'04-7196-2020'::text,36.050583::float8,139.814858::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:d200cef153ac9e66dc56a471'::text,'木間ケ瀬公民館'::text,'千葉県野田市木間ケ瀬2935'::text,'04-7198-3171'::text,36.018961::float8,139.840622::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:b42c5edc4041f7d44ac315d6'::text,'市民会館'::text,'千葉県野田市野田370-8'::text,'04-7124-6851'::text,35.945689::float8,139.865478::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:9e2ffb40f59e66883e8d11ff'::text,'鈴木貫太郎記念館'::text,'千葉県野田市関宿町1273'::text,'04-7196-0120'::text,36.091183::float8,139.785783::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:d1fdbffecc7de02731fcf0ee'::text,'七光台集会所'::text,'千葉県野田市七光台49-6'::text,'04-7127-2027'::text,35.979253::float8,139.851667::float8,NULL::text,NULL::text,false::bool),
('bodik-reviewed:4b26bba6bd0ee29a:86858fee617dae0b28c7773d'::text,'島集会所'::text,'千葉県野田市山崎2516'::text,'04-7125-7944'::text,35.919828::float8,139.89825::float8,NULL::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45685 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','野田市'::text,address,phone,latitude,longitude,'野田市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.noda.chiba.jp/shisei/johokoukai/opendata/1007928.html'::text,'CC BY 4.0','2026-07-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45710 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12208_noda_26_7aed_compact_01'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
