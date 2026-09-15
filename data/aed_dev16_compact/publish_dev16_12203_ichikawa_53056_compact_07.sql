begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:6fe2d9d857c9fac4c7b3842b'::text,'柏井公民館'::text,'千葉県市川市柏井町2丁目844'::text,'(047)338-2988'::text,35.74600643::float8,139.965418::float8,'事務室入口横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e3f5252686873a5c3a1b67bf'::text,'里見公園'::text,'千葉県市川市国府台3丁目9'::text,'(047)372-0062'::text,35.74665104::float8,139.8999283::float8,'事務所内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ee1c534493aae41b848bd6f8'::text,'曽谷小学校'::text,'千葉県市川市曽谷7丁目18-1'::text,'(047)371-7888'::text,35.74690477::float8,139.9268295::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:63bb84d570a018088cf56db2'::text,'曽谷保育園'::text,'千葉県市川市曽谷7丁目28-15'::text,'(047)373-5530'::text,35.74844845::float8,139.9259445::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2d1c6cf321277ed7d2ad5b5a'::text,'東国分中学校'::text,'千葉県市川市東国分3丁目5-1'::text,'(047)371-5963'::text,35.74889297::float8,139.9227638::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:024153a786ac2a385070d42c'::text,'西部公民館'::text,'千葉県市川市中国分2丁目13-8'::text,'(047)373-8175'::text,35.74934744::float8,139.9133309::float8,'正面玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:3e7bd34eb41bee9bfe452f20'::text,'明松園'::text,'千葉県市川市中国分2丁目17-21'::text,'(047)372-9017'::text,35.75015031::float8,139.9131221::float8,'事務室カウンタ-'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b80d9bf4f75d83595ddb5f34'::text,'大柏小学校'::text,'千葉県市川市大野町2丁目1877'::text,'(047)337-8141'::text,35.75035095::float8,139.9538418::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d9a98876f292dd2cd58f34ec'::text,'市川市北消防署'::text,'千葉県市川市大野町4丁目2163-1'::text,'(047)338-0119'::text,35.75117195::float8,139.9602701::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0b1e7e3b2c10c8f673e6e53f'::text,'万葉植物園'::text,'千葉県市川市大野町2丁目1857'::text,'(047)337-9866'::text,35.75319961::float8,139.9527259::float8,'事務所内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b1abf859100a391a9ad3c131'::text,'第五中学校'::text,'千葉県市川市大野町3丁目1993'::text,'(047)337-8344'::text,35.75298163::float8,139.9568837::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b07fa72b508d13e1df4df08e'::text,'国府台小学校'::text,'千葉県市川市国府台5丁目25-4'::text,'(047)372-4672'::text,35.7535364::float8,139.9030248::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:8f45083f0b4c4d87c64560a3'::text,'中国分小学校'::text,'千葉県市川市中国分1丁目22-1'::text,'(047)371-7886'::text,35.75367233::float8,139.9158675::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:6464c1c56846f921fc080c91'::text,'J:COM北市川スポーツパーク'::text,'千葉県市川市柏井町4丁目277-1'::text,'(047)337-1810'::text,35.75351937::float8,139.9670079::float8,'管理棟内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:9c318a22c89b3d4417847f08'::text,'須和田の丘特別支援学校稲越校舎'::text,'千葉県市川市稲越町518-2'::text,'(047)373-9000'::text,35.75417469::float8,139.9242707::float8,'保健室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:68aeb546d09b578ad8406e20'::text,'稲越小学校'::text,'千葉県市川市稲越町518-2'::text,'(047)373-8401'::text,35.75415177::float8,139.9239772::float8,'2階保健室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:8f6faf36b4c552f81a7ae780'::text,'霊園'::text,'千葉県市川市大野町4丁目2481'::text,'(047)337-5696'::text,35.75735927::float8,139.9706025::float8,'事務室入口正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a0a4c6d27f02e4e3b72c8064'::text,'大野地域ふれあい館'::text,'千葉県市川市大野町3丁目1625-1'::text,'(047)338-3754'::text,35.75800884::float8,139.9554341::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:bff7ae251dcb8380e71f9dcd'::text,'いきいきセンタ-北国分'::text,'千葉県市川市北国分1丁目12-32'::text,'(047)377-2167'::text,35.7588551::float8,139.9035448::float8,'1階活動室内壁面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2f4a95bdb44691532ae4f49d'::text,'市川歴史博物館'::text,'千葉県市川市堀之内2丁目27-1'::text,'(047)373-6351'::text,35.75983413::float8,139.9115302::float8,'歴史博物館事務室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2e8c7e5a4af309ae044c9463'::text,'市川市斎場'::text,'千葉県市川市大野町4丁目2610-1'::text,'(047)338-2941'::text,35.76191297::float8,139.9714241::float8,'事務室入口正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:cef7902f18e8087dd9452f3d'::text,'動植物園'::text,'千葉県市川市大町284-1'::text,'(047)338-1960'::text,35.7642707::float8,139.9659541::float8,'事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:93d4f4a7ead937393ef3fc0e'::text,'少年自然の家'::text,'千葉県市川市大町280-4'::text,'(047)337-0533'::text,35.76603089::float8,139.9662272::float8,'事務室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:251576781267451d2eeb987f'::text,'観賞植物園'::text,'千葉県市川市大町213-11'::text,'(047)339-4411'::text,35.76845712::float8,139.9704539::float8,'事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:3c86e618f75516e9c070cdcd'::text,'大町小学校'::text,'千葉県市川市大町84-10'::text,'(047)337-3610'::text,35.7718004::float8,139.9570515::float8,'保健室前'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45531 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45556 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_07'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
