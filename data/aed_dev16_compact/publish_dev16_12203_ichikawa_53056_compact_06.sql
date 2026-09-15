begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:5b4494803643dd25a4a36953'::text,'菅野終末処理場'::text,'千葉県市川市東菅野2丁目23-1'::text,'(047)325-0144'::text,35.73558081::float8,139.9278407::float8,'2階入口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0d17261e6c79b6ecd629398d'::text,'宮久保小学校'::text,'千葉県市川市宮久保5丁目7-1'::text,'(047)371-2747'::text,35.73668167::float8,139.9440741::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:bcc5765032095532e2f67f45'::text,'いきいきセンタ-宮久保'::text,'千葉県市川市宮久保4丁目2-4'::text,'(047)372-5755'::text,35.73696561::float8,139.9361213::float8,'1階玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:8dec5c7356c6974e6c2d601e'::text,'真間小学校'::text,'千葉県市川市真間4丁目1-1'::text,'(047)372-4726'::text,35.73775801::float8,139.9102676::float8,'第4昇降口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0d76a3e5ffa57e7d7bd093da'::text,'須和田の丘特別支援学校'::text,'千葉県市川市須和田2丁目34-1'::text,'(047)371-2258'::text,35.73816268::float8,139.9134253::float8,'1階保健室横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:22a575777e9d160af745f2b7'::text,'第二中学校'::text,'千葉県市川市須和田2丁目34-1'::text,'(047)371-6188'::text,35.73922357::float8,139.9141234::float8,'玄関内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:75737ee15d6a7205e3e0fdf3'::text,'柏井小学校'::text,'千葉県市川市柏井町1丁目1149-1'::text,'(047)337-8877'::text,35.73942802::float8,139.9663513::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:fdb8517ac5c030d195f8a70d'::text,'下貝塚中学校'::text,'千葉県市川市下貝塚3丁目13-1'::text,'(047)371-8800'::text,35.73966566::float8,139.945743::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:55ec40b11feea8f99962b6b1'::text,'木内ギャラリ-'::text,'千葉県市川市真間4丁目11-4'::text,'(047)371-4916'::text,35.73997441::float8,139.9054813::float8,'事務室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:429f9c5f91caf545d687f059'::text,'芳澤ガ-デンギャラリ-'::text,'千葉県市川市真間5丁目1-18'::text,'(047)374-7687'::text,35.73981305::float8,139.9114255::float8,'事務所前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:02887c73135f39cd1e3a5c48'::text,'百合台小学校'::text,'千葉県市川市曽谷6丁目10-1'::text,'(047)374-1811'::text,35.74035838::float8,139.9252955::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:14fc78eb4ce5300d0c25ee3c'::text,'第三中学校'::text,'千葉県市川市曽谷3丁目2-1'::text,'(047)371-7341'::text,35.74037382::float8,139.9327453::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f0a700db02dcdd575eec19c7'::text,'百合台幼稚園'::text,'千葉県市川市曽谷6丁目10-1'::text,'(047)373-8937'::text,35.74035838::float8,139.9252955::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:4013eb0f630989c560fb50f3'::text,'郭沫若記念館'::text,'千葉県市川市真間5丁目3-19'::text,'(047)372-5400'::text,35.74108743::float8,139.9126613::float8,'事務室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d22c99699162217142ed7d3b'::text,'大野小学校'::text,'千葉県市川市南大野1丁目42-1'::text,'(047)338-3000'::text,35.74233965::float8,139.9505695::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:670508efc17e9320678b85fe'::text,'国府台市民体育館'::text,'千葉県市川市国府台1丁目6-4'::text,'(047)373-3112'::text,35.74310837::float8,139.9074541::float8,'1階ロビ-'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:1285942956be1f65e62a2bec'::text,'大野保育園'::text,'千葉県市川市南大野2丁目4-5'::text,'(047)337-4551'::text,35.74289594::float8,139.9530272::float8,'玄関ホール'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a5b77923e2c6c687e44af9fc'::text,'曽谷公民館'::text,'千葉県市川市曽谷6丁目25-5'::text,'(047)372-2871'::text,35.74364645::float8,139.9273814::float8,'玄関ロビー'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:06b97d090742d066660918c5'::text,'奉免地域ふれあい館'::text,'千葉県市川市柏井町2丁目49-6'::text,'(047)338-5407'::text,35.74420344::float8,139.9587862::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:6d38869b8641a691d6234174'::text,'市川市西消防署国府台出張所'::text,'千葉県市川市国府台1丁目6-8'::text,'(047)372-0119'::text,35.74438916::float8,139.9054886::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:72328cdd3c2676b1023ca360'::text,'第一中学校'::text,'千葉県市川市国府台2丁目7-1'::text,'(047)371-6045'::text,35.74479382::float8,139.9019905::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:77c9a9c9b48350e1fbc04359'::text,'国分小学校'::text,'千葉県市川市東国分2丁目4-1'::text,'(047)371-6793'::text,35.74488457::float8,139.9208839::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0401eef5907031d108a7f50f'::text,'市川市北消防署曽谷出張所'::text,'千葉県市川市曽谷2丁目7-2'::text,'(047)374-0119'::text,35.74517193::float8,139.9357402::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e8790c724d59d08127f1b003'::text,'大柏出張所(大野公民館)'::text,'千葉県市川市南大野2丁目3-19'::text,'(047)339-1111'::text,35.74519914::float8,139.9531863::float8,'2階公民館事務室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:c7b13ff13291408217d251a0'::text,'いちかわ市民キャンプ場'::text,'千葉県市川市柏井町2丁目992-1'::text,'(047)337-9802'::text,35.74437545::float8,139.9737677::float8,'管理棟内'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45506 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45531 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_06'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
