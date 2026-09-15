begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:4645c4fd216229309fb9ef58'::text,'香取保育園'::text,'千葉県市川市香取2丁目6-25'::text,'(047)357-4191'::text,35.67962661::float8,139.9091528::float8,'玄関ホール'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:45ec4894159a6adb4a9888b5'::text,'市川市南消防署広尾出張所'::text,'千葉県市川市広尾2丁目2-12'::text,'(047)306-0119'::text,35.67976465::float8,139.890571::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:04a2ddd4e66962b8217b49bd'::text,'新浜小学校'::text,'千葉県市川市行徳駅前4丁目5-1'::text,'(047)395-5331'::text,35.68002287::float8,139.9163037::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:cd3c48eaed2b7957c247ebec'::text,'南行徳公民館'::text,'千葉県市川市相之川1丁目3-7'::text,'(047)356-7371'::text,35.68023121::float8,139.8991092::float8,'正面玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0c0ed9bb73c16e9f366523d9'::text,'幸公民館'::text,'千葉県市川市幸1丁目16-18'::text,'(047)398-0481'::text,35.68033567::float8,139.9278491::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f6b1e5fa3d9a6d8f7f45cea9'::text,'南行徳小学校'::text,'千葉県市川市欠真間1丁目6-38'::text,'(047)357-3126'::text,35.68048109::float8,139.9013056::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:585beb977532db66c1b5f941'::text,'南行徳図書館'::text,'千葉県市川市相之川1丁目2-4'::text,'(047)357-4188'::text,35.68086077::float8,139.8999034::float8,'1階カウンター内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:9bba6c4533b01f71128cea8b'::text,'幸小学校'::text,'千葉県市川市幸1丁目11-1'::text,'(047)346-0770'::text,35.68102148::float8,139.9298989::float8,'1階保健室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:47d9a93673af9bb683224843'::text,'市川市南行徳地域共生センター'::text,'千葉県市川市香取1丁目17-18'::text,'(047)357-1104'::text,35.68226973::float8,139.9032718::float8,'1階玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:c3e94a7a157ce58df3817df9'::text,'塩焼小学校'::text,'千葉県市川市塩焼5丁目9-8'::text,'(047)397-1231'::text,35.68402829::float8,139.9302299::float8,'事務室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0aeacc404181d0353a58b8fa'::text,'市川市東消防署高谷出張所'::text,'千葉県市川市高谷2023-10'::text,'(047)327-0119'::text,35.68502068::float8,139.9496456::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b372556ba77acc98dbb3e7c9'::text,'塩焼幼稚園'::text,'千葉県市川市塩焼5丁目9-1'::text,'(047)397-3857'::text,35.68490998::float8,139.9297248::float8,'職員室入口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2cf5ecc026e322afc1b6e665'::text,'湊地域ふれあい館'::text,'千葉県市川市湊11-18'::text,'(047)357-9864'::text,35.68504181::float8,139.9101522::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:42915cdefc6d3646612fc5c7'::text,'行徳図書館'::text,'千葉県市川市末広1丁目1-31'::text,'(047)358-9011'::text,35.68527961::float8,139.9167271::float8,'2階入口脇'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a9696cc81e8bb544c1f9b027'::text,'塩焼第2保育園'::text,'千葉県市川市塩焼3丁目11-15'::text,'(047)395-5176'::text,35.68534785::float8,139.9245812::float8,'玄関ホール'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:82917fed9cd04a85e2d6261d'::text,'行徳支所'::text,'千葉県市川市末広1丁目1-31'::text,'(047)359-1114'::text,35.68571235::float8,139.9163707::float8,'公民館入口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:978508f99d347708d5c75a7f'::text,'行徳文化ホ-ルI&I'::text,'千葉県市川市末広1丁目1-48'::text,'(047)701-3011'::text,35.68612101::float8,139.9165716::float8,'1階ロビ-'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:fc4e329153349533695e69ce'::text,'第七中学校'::text,'千葉県市川市末広1丁目1-48'::text,'(047)357-3183'::text,35.68651524::float8,139.9172473::float8,'来客者用玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:78075d469cb98c574d96ee85'::text,'妙典中学校'::text,'千葉県市川市妙典5丁目22-1'::text,'(047)395-5811'::text,35.68811628::float8,139.9337075::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:89b288306b988f6fd4b48f37'::text,'塩焼保育園'::text,'千葉県市川市塩焼2丁目2-5'::text,'(047)396-0169'::text,35.68829506::float8,139.9265158::float8,'玄関ホール'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:4df9a005b8bdd66d044ccfbe'::text,'クリ-ンセンタ-'::text,'千葉県市川市田尻1003'::text,'(047)327-0288'::text,35.6882975::float8,139.942846::float8,'中央制御室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:8f11571a5074203673eb0bed'::text,'行徳地域ふれあい館'::text,'千葉県市川市富浜2丁目5-19'::text,'(047)357-3276'::text,35.68884855::float8,139.9216715::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:6abb65f70d2ef39d6ab5a7b2'::text,'行徳小学校'::text,'千葉県市川市富浜1丁目1-40'::text,'(047)357-3116'::text,35.69279817::float8,139.9237401::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:fab17d7d111334aa12816147'::text,'市川市南消防署行徳出張所'::text,'千葉県市川市本行徳12-10'::text,'(047)356-0119'::text,35.6942926::float8,139.9181406::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:269b53268bf6e7aec885bd38'::text,'本行徳公民館'::text,'千葉県市川市本行徳12-8'::text,'(047)359-1351'::text,35.69454942::float8,139.9182866::float8,'1階エレベ-タ-横'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45406 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45431 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_02'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
