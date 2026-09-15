begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:ddef68d5e0e6cc1d4303e739'::text,'高谷中学校'::text,'千葉県市川市高谷1627-4'::text,'(047)328-0211'::text,35.6947412::float8,139.9453145::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:4d027d193898a987ebfca068'::text,'妙典小学校'::text,'千葉県市川市妙典2丁目14-2'::text,'(047)399-5891'::text,35.69616519::float8,139.9298327::float8,'江戸川側(ピンクドア)玄関脇'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:262235f84a9ee8c898931661'::text,'身体障がい者福祉センタ-'::text,'千葉県市川市本行徳1-5'::text,'(047)357-9165'::text,35.6962148::float8,139.9193014::float8,'事務室カウンター'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:bbfb12e974b2c5cb0c530a67'::text,'二俣小学校'::text,'千葉県市川市二俣678'::text,'(047)328-0105'::text,35.69696469::float8,139.9566022::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:7ef6f6f602df09f32201ed8e'::text,'信篤小学校'::text,'千葉県市川市原木2丁目16-1'::text,'(047)328-0165'::text,35.69815584::float8,139.9437047::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:fa054a40b0a6a4f14cedfdf0'::text,'信篤市民体育館'::text,'千葉県市川市高谷1丁目8-2'::text,'(047)327-6336'::text,35.70169648::float8,139.9422535::float8,'正面玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:691411e33d14a57b8699670a'::text,'信篤公民館'::text,'千葉県市川市高谷1丁目8-1'::text,'(047)327-6807'::text,35.70171451::float8,139.9418168::float8,'公民館事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:436e674921f2692536cfb89e'::text,'いきいきセンタ-田尻'::text,'千葉県市川市田尻4丁目13-3'::text,'(047)379-8631'::text,35.70332935::float8,139.9344241::float8,'1階玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:104d75dbe106b5f579c6b29e'::text,'第六中学校'::text,'千葉県市川市鬼高3丁目16-1'::text,'(047)370-0535'::text,35.71085001::float8,139.9360018::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:9a87dd1e7ff070b9c23a01c6'::text,'こども発達センタ-分館'::text,'千葉県市川市稲荷木1丁目14-1'::text,'(047)712-6555'::text,35.71183109::float8,139.9208549::float8,'玄関ロビー'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:01029d729d4f578831d48605'::text,'鬼高保育園'::text,'千葉県市川市鬼高1丁目11-20'::text,'(047)378-8186'::text,35.71149149::float8,139.932224::float8,'事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:989fdef650015f53538f3f0f'::text,'稲荷木保育園'::text,'千葉県市川市稲荷木1丁目26-16'::text,'(047)377-5070'::text,35.71168472::float8,139.9246435::float8,'事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:67683be4a2d167558de2034f'::text,'稲荷木小学校'::text,'千葉県市川市稲荷木1丁目14-1'::text,'(047)376-5961'::text,35.71159763::float8,139.9217963::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a201f80f3c02c5d696fd36cd'::text,'鬼高公民館'::text,'千葉県市川市鬼高2丁目12-23'::text,'(047)334-2612'::text,35.7132421::float8,139.9388062::float8,'事務室横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d101f086e7a406cd2f56ea3d'::text,'勤労福祉センタ-'::text,'千葉県市川市南八幡2丁目20-1'::text,'(047)370-5201'::text,35.71375603::float8,139.9273655::float8,'玄関正面横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:2c7b45c52d5e2902133c2177'::text,'鬼高小学校'::text,'千葉県市川市鬼高2丁目13-5'::text,'(047)335-0304'::text,35.7139329::float8,139.9376006::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:7ac739397059dba9f299a1b6'::text,'生涯学習センタ- メディアパ-ク市川'::text,'千葉県市川市鬼高1丁目1-4'::text,'(047)320-3335'::text,35.71565347::float8,139.932073::float8,'教育センタ-受付・生涯学習センター1階ロビー'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:21c0ed8f8df889952d86ccc7'::text,'鬼越・鬼高地域ふれあい館'::text,'千葉県市川市鬼越2丁目15-10'::text,'(047)335-9838'::text,35.71650735::float8,139.9381205::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:54652b2e9b9a1099819f8fa9'::text,'文化会館'::text,'千葉県市川市大和田1丁目1-5'::text,'(047)379-5111'::text,35.7168087::float8,139.9210079::float8,'事務室・大ホール楽屋通路'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:16ac7810c7093ec00f13aa26'::text,'中山窓口連絡所'::text,'千葉県市川市中山4丁目14-1'::text,'(047)332-6661'::text,35.71727681::float8,139.9459231::float8,'1階執務室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:cb32a74ebe6e7d467b1fb211'::text,'清華園'::text,'千葉県市川市中山4丁目14-1'::text,'(047)333-6147'::text,35.71719924::float8,139.9459885::float8,'正面玄関脇'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:117032bacc3fa1c78d8e9162'::text,'大和田小学校'::text,'千葉県市川市大和田1丁目1-3'::text,'(047)378-5001'::text,35.71766999::float8,139.9216572::float8,'職員室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:8f5508783f114c65957fe76a'::text,'保健センタ-'::text,'千葉県市川市南八幡4丁目18-8'::text,'(047)377-4511'::text,35.71741023::float8,139.9239765::float8,'玄関(風除室)'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:16d09c6c35c897724b8edc1e'::text,'市川市西消防署大洲出張所'::text,'千葉県市川市大洲1丁目18-1'::text,'(047)376-0119'::text,35.71785499::float8,139.9108748::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ce7ae591851bdf3d4eef35e3'::text,'鶴指小学校'::text,'千葉県市川市大和田4丁目11-1'::text,'(047)379-3588'::text,35.71813496::float8,139.9157266::float8,'職員室前'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45431 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45456 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_03'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
