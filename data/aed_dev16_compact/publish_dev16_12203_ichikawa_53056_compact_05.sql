begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:72c55b59b1043142d2c5d2e1'::text,'新田第2保育園'::text,'千葉県市川市新田2丁目1-24'::text,'(047)376-9036'::text,35.72529652::float8,139.9163785::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:cac1577ba4ab41284e8c4517'::text,'いきいきセンタ-北方'::text,'千葉県市川市北方2丁目29-19'::text,'(047)332-3846'::text,35.72540444::float8,139.9410554::float8,'1階受付正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:eaea4741682a84f661d1e015'::text,'八幡小学校'::text,'千葉県市川市八幡3丁目24-1'::text,'(047)325-4763'::text,35.72568684::float8,139.9280701::float8,'校長室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:80b53d02fdd54d1b4552034d'::text,'若宮小学校'::text,'千葉県市川市若宮3丁目54-10'::text,'(047)339-2177'::text,35.7267139::float8,139.9523055::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:db278d0c072a7fa3d8978528'::text,'宮田小学校'::text,'千葉県市川市新田4丁目8-15'::text,'(047)379-7647'::text,35.72689568::float8,139.9093288::float8,'保健室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:41a2196b0b3ac9a5f5c75e2e'::text,'冨貴島小学校'::text,'千葉県市川市八幡6丁目10-11'::text,'(047)334-2624'::text,35.72698583::float8,139.9377577::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:556b0150f993252946a92b13'::text,'宮田地域ふれあい館'::text,'千葉県市川市新田5丁目16-6'::text,'(047)324-4525'::text,35.72760198::float8,139.9111636::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:c0bd769db89fed924a960614'::text,'市川駅行政サ-ビスセンタ-'::text,'千葉県市川市市川南1丁目1-1'::text,'(047)704-3115'::text,35.72853397::float8,139.9080647::float8,'待合ロビー'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:5c7d5ad14537c8629f9c703d'::text,'富貴島保育園'::text,'千葉県市川市八幡6丁目14-19'::text,'(047)336-1144'::text,35.72849004::float8,139.9355638::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e943369d3f3e3d734e83b88d'::text,'東部公民館'::text,'千葉県市川市本北方3丁目19-16'::text,'(047)337-8886'::text,35.72880397::float8,139.9508134::float8,'玄関受付横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:000d2664e3e7c74157776c4f'::text,'市川駅南口図書館'::text,'千葉県市川市市川南1丁目10-1'::text,'(047)325-6241'::text,35.7291751::float8,139.9062854::float8,'図書館入口右側'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:78adf631f41f12241da95bcc'::text,'市川市アイ・リンクタウン展望施設'::text,'千葉県市川市市川南1丁目10-1'::text,'(047)322-9300'::text,35.72913959::float8,139.9058612::float8,'交流ラウンジ'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:79a74bb411bd232ff6c824ed'::text,'男女共同参画センタ- ウィズ'::text,'千葉県市川市市川1丁目24-2'::text,'(047)322-6700'::text,35.73002786::float8,139.9104011::float8,'4階窓口前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0b831574cf97bdd395cee2da'::text,'市川市西消防署'::text,'千葉県市川市市川1丁目24-2'::text,'(047)323-0119'::text,35.73018022::float8,139.9104639::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:9cc6eb9446863e2b4695e538'::text,'本北方保育園'::text,'千葉県市川市本北方2丁目40-23'::text,'(047)338-5982'::text,35.73020193::float8,139.9501907::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:bedddffc8834886347c2901b'::text,'市川地域ふれあい館'::text,'千葉県市川市市川2丁目7-7'::text,'(047)322-7710'::text,35.7309667::float8,139.9035244::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f52e4a64bed4e9dab9c2b395'::text,'市川公民館'::text,'千葉県市川市市川2丁目33-2'::text,'(047)321-1171'::text,35.73106183::float8,139.9065932::float8,'玄関ホール脇事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:772e52b9b611628ec2c1c068'::text,'いきいきセンタ-市川'::text,'千葉県市川市市川2丁目33-6'::text,'(047)322-2277'::text,35.73149492::float8,139.9060328::float8,'3階廊下'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:6a47a36025eb307fc32ab975'::text,'市川小学校'::text,'千葉県市川市市川2丁目32-5'::text,'(047)325-4758'::text,35.73215889::float8,139.9052769::float8,'校長室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ca72c3a4216bd7466c56195a'::text,'北方小学校'::text,'千葉県市川市北方町4丁目1356-1'::text,'(047)339-1701'::text,35.73245879::float8,139.9453395::float8,'職員玄関横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:4a205961437b4186b4c3036b'::text,'菅野公民館'::text,'千葉県市川市菅野3丁目24-2'::text,'(047)322-7761'::text,35.73263233::float8,139.9168627::float8,'事務室横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f4176aa8ab94c22dcbe14712'::text,'菅野保育園'::text,'千葉県市川市菅野4丁目12-16'::text,'(047)326-4452'::text,35.73290944::float8,139.9272147::float8,'事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:1ce134842b257dc0e1fce92f'::text,'菅野小学校'::text,'千葉県市川市菅野6丁目14-1'::text,'(047)324-5955'::text,35.73428494::float8,139.9166006::float8,'校長室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ef27634f8a56cef514719134'::text,'大柏川第一調節池緑地'::text,'千葉県市川市北方町4丁目1444-59'::text,'(047)337-7111'::text,35.73600801::float8,139.9512743::float8,'事務室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f71fd64d6f8203e1a72fc757'::text,'市川市市民プ-ル'::text,'千葉県市川市北方町4丁目2270-3'::text,'(047)338-7346'::text,35.73503797::float8,139.9534251::float8,'医務室'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45481 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45506 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_05'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
