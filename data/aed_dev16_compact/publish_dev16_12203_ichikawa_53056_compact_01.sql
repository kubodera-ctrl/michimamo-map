begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:bbdb8a269fa835add94a08af'::text,'いちかわ観光・物産インフォメーション(旧八幡市民談話室)'::text,'千葉県市川市八幡2丁目4-8'::text,'(047)335-1711'::text,35.72257083::float8,139.9279823::float8,'正面玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b5fa2b33142fd32eab02333b'::text,'塩浜市民体育館'::text,'千葉県市川市塩浜4丁目9-1'::text,'(047)398-2311'::text,35.66089245::float8,139.9141429::float8,'1階ロビ-'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2bc738537f665c69b323745e'::text,'地域ケア南行徳第二'::text,'千葉県市川市塩浜4丁目2-2-101'::text,'(047)398-8347'::text,35.66245927::float8,139.9132544::float8,'玄関左'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:de8236352b18a0bd3f43a4ef'::text,'塩浜保育園'::text,'千葉県市川市塩浜4丁目2-10-101'::text,'(047)397-2628'::text,35.66318308::float8,139.9114252::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:05749970fe07a9cfc6f960d5'::text,'いきいきセンタ-塩浜'::text,'千葉県市川市塩浜4丁目3-1-101'::text,'(047)395-2586'::text,35.66309961::float8,139.9133149::float8,'1階玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:605a5f016cbf9ba59567c49b'::text,'塩浜学園(前期課程)'::text,'千葉県市川市塩浜4丁目6-1'::text,'(047)397-4421'::text,35.66385813::float8,139.9156376::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:16283d1a46fe226b54109753'::text,'塩浜学園(後期課程)'::text,'千葉県市川市塩浜4丁目5-1'::text,'(047)397-1250'::text,35.66525808::float8,139.9142762::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d81896f2e2ec52d0f8e48e46'::text,'福栄スポ-ツ広場'::text,'千葉県市川市福栄4丁目32-4'::text,'(047)398-0606'::text,35.66666259::float8,139.9119985::float8,'管理棟受付横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:403297548cd85130190034bc'::text,'いきいきセンタ-福栄'::text,'千葉県市川市福栄4丁目32-2'::text,'(047)395-6906'::text,35.66939283::float8,139.9106694::float8,'1階ホ-ル'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e13a8948f79e49f0860d13c0'::text,'新井地域ふれあい館'::text,'千葉県市川市新井3丁目31-1'::text,'(047)395-5019'::text,35.66974838::float8,139.8986617::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:54ef60031e129879c449bffd'::text,'南行徳中学校'::text,'千葉県市川市南行徳2丁目2-2'::text,'(047)397-5910'::text,35.6709626::float8,139.9072297::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d68d6707a8b170e445e671ab'::text,'富美浜小学校'::text,'千葉県市川市南行徳2丁目3-1'::text,'(047)396-2522'::text,35.67152659::float8,139.9053257::float8,'校長室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0e5ae3a22d2c9e1b65e64cdc'::text,'南行徳保健センタ-'::text,'千葉県市川市南行徳1丁目21-1'::text,'(047)359-8785'::text,35.67168285::float8,139.9014293::float8,'事務室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:08a1e932d38b88fd9371c67d'::text,'南行徳市民センタ-'::text,'千葉県市川市南行徳1丁目21-1'::text,'(047)359-7891'::text,35.67157919::float8,139.9012819::float8,'正面玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2c6511a680cb6b933327cc56'::text,'福栄小学校'::text,'千葉県市川市南行徳2丁目2-1'::text,'(047)397-8115'::text,35.67188268::float8,139.9070968::float8,'市民図書室前廊下'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:5ea34d5c1aaf3ec5ec73f45f'::text,'福栄中学校'::text,'千葉県市川市福栄3丁目4-1'::text,'(047)396-0701'::text,35.67381073::float8,139.910022::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d16297264b201495be04954c'::text,'南新浜小学校'::text,'千葉県市川市新浜1丁目26-1'::text,'(047)396-9731'::text,35.67459572::float8,139.916584::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d5e7b6842452f6a449af8ef7'::text,'新井小学校'::text,'千葉県市川市新井1丁目18-13'::text,'(047)357-1722'::text,35.67395687::float8,139.8905462::float8,'1階昇降口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2140f63bc3fcf3a2a7588ef3'::text,'富美浜地域ふれあい館'::text,'千葉県市川市欠真間2丁目31-5'::text,'(047)356-5844'::text,35.6753644::float8,139.9054193::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f57e3b52bb56c016387796e5'::text,'いきいきセンタ-日之出'::text,'千葉県市川市日之出8-18'::text,'(047)397-8221'::text,35.67809408::float8,139.9236631::float8,'1階玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:dc75ea7a8b7e9504a64f58a7'::text,'行徳保育園'::text,'千葉県市川市行徳駅前4丁目22-17'::text,'(047)395-4843'::text,35.67848775::float8,139.9136851::float8,'事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:af200f4c96c6dfdcba2b8bd9'::text,'広尾防災公園'::text,'千葉県市川市広尾2丁目3'::text,'(047)359-0155'::text,35.6787706::float8,139.8893155::float8,'事務所内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:24458879f184c5cef583fbd0'::text,'香取地域ふれあい館'::text,'千葉県市川市香取2丁目19-1'::text,'(047)358-3854'::text,35.67914621::float8,139.9100237::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:aeb7d75e5fb92d824d65bb60'::text,'南行徳幼稚園'::text,'千葉県市川市欠真間1丁目6-15'::text,'(047)358-5333'::text,35.67953437::float8,139.9007403::float8,'職員玄関入口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:c523ac2975cae457545b953b'::text,'市川市南消防署'::text,'千葉県市川市行徳駅前4丁目6-19'::text,'(047)397-0119'::text,35.67958484::float8,139.9151399::float8,'1階受付'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45381 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45406 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_01'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
