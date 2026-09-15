begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:be026a3158d3d048cad7446b'::text,'急病診療所'::text,'千葉県市川市大洲1丁目18-1'::text,'(047)377-1222'::text,35.71802366::float8,139.9109634::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0e4944d839f1df3b975548ae'::text,'八幡地域ふれあい館'::text,'千葉県市川市八幡1丁目21-10'::text,'(047)332-5538'::text,35.71886181::float8,139.9323711::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ede40883bcb805f7558c6b14'::text,'勤労福祉センタ-分館'::text,'千葉県市川市南八幡5丁目20-3'::text,'(047)370-1357'::text,35.71883625::float8,139.9211129::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d88bf870c2b42d192720e462'::text,'第八中学校'::text,'千葉県市川市大和田4丁目9-1'::text,'(047)370-1394'::text,35.71914786::float8,139.9149047::float8,'保健室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a192caca7bf6627dff7b1d4e'::text,'市川市消防局'::text,'千葉県市川市八幡1丁目8-1'::text,'(047)333-2111'::text,35.71942036::float8,139.9347577::float8,'3階執務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:5ae705a11b51c19b0e9cb64e'::text,'市川市東消防署'::text,'千葉県市川市八幡1丁目8-1'::text,'(047)334-0119'::text,35.71949296::float8,139.9346375::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b91a528b8ea67eca14a37015'::text,'いきいきセンタ-鬼越'::text,'千葉県市川市鬼越1丁目25-3'::text,'(047)335-5779'::text,35.72028446::float8,139.938658::float8,'1階廊下'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d1d3baf55652bc0490a68532'::text,'いちかわ情報プラザ'::text,'千葉県市川市南八幡4丁目2-5-201'::text,'(047)318-9188'::text,35.7205862::float8,139.9265163::float8,'2階総務課統計班入口'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:9fd8b51f1b58f94d58b7f2b7'::text,'大洲幼稚園'::text,'千葉県市川市大洲4丁目3-12'::text,'(047)370-3648'::text,35.72102304::float8,139.9096416::float8,'職員玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:03b86048c3bfeb5ae9014cab'::text,'大洲中学校'::text,'千葉県市川市大洲4丁目21-5'::text,'(047)378-5783'::text,35.72134386::float8,139.9077712::float8,'事務室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b5c74986f79732fcb9c49aec'::text,'中山小学校'::text,'千葉県市川市中山1丁目1-5'::text,'(047)335-2711'::text,35.72151493::float8,139.9438959::float8,'事務室前廊下'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:08561e39eb0d5eb559adef1e'::text,'市役所第二庁舎'::text,'千葉県市川市南八幡2丁目20-2'::text,'(047)712-8647'::text,35.7136079::float8,139.9280099::float8,'総合受付横'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:4a50cc8783e520c7ed676543'::text,'第四中学校'::text,'千葉県市川市中山1丁目11-1'::text,'(047)335-3431'::text,35.72202753::float8,139.9458313::float8,'1階情報コ-ナ-'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e81fd4e3d5d3e489296e3f4d'::text,'本八幡地域ふれあい館'::text,'千葉県市川市八幡3丁目7-9'::text,'(047)326-2452'::text,35.72208414::float8,139.9245948::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:872e97ebc07f5f61c79799c6'::text,'市川市分庁舎C棟(地域共生課)'::text,'千葉県市川市東大和田1丁目2-10'::text,'(047)383-9568'::text,35.71407165::float8,139.9268921::float8,'2階通路左手事務室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:83fc857a87e4dfcad89d2a59'::text,'若宮公民館'::text,'千葉県市川市若宮2丁目15-8'::text,'(047)336-7958'::text,35.72246126::float8,139.9557345::float8,'玄関ロビー'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:591331c1b65757feb5418946'::text,'東山魁夷記念館'::text,'千葉県市川市中山1丁目16-2'::text,'(047)333-2011'::text,35.7228525::float8,139.9464463::float8,'階段踊り場'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d07c0ffcbb1ba50389b1de37'::text,'新田保育園'::text,'千葉県市川市新田3丁目21-1'::text,'(047)370-4557'::text,35.72355146::float8,139.9118523::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:7f2562d2a191d3f6b5327c71'::text,'八幡市民会館(全日警ホール)'::text,'千葉県市川市八幡4丁目2-1'::text,'(047)300-8020'::text,35.72410552::float8,139.9307588::float8,'1階正面玄関脇、エレベーター前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:f16fcc8a54500585aa25813d'::text,'大洲小学校'::text,'千葉県市川市大洲4丁目18-1'::text,'(047)370-0300'::text,35.72346079::float8,139.9068888::float8,'保健室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:290507b539d301ce5451f242'::text,'平田小学校'::text,'千葉県市川市平田3丁目28-1'::text,'(047)379-6761'::text,35.72422237::float8,139.9181703::float8,'保健室脇'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:685897c6569a8a34932d76c1'::text,'若宮保育園'::text,'千葉県市川市若宮3丁目7-6'::text,'(047)334-2115'::text,35.7242771::float8,139.951727::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:d1f42b4eb889ab54e063d984'::text,'市川市東消防署中山出張所'::text,'千葉県市川市北方3丁目10-11'::text,'(047)332-0119'::text,35.72442533::float8,139.9476466::float8,'1階受付'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:5fd300d0d03afc2a348030a9'::text,'平田保育園'::text,'千葉県市川市平田1丁目20-16'::text,'(047)324-1311'::text,35.72475118::float8,139.919499::float8,'玄関'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a94d5c5bb8b6301714a3f5d2'::text,'平田地域ふれあい館'::text,'千葉県市川市平田2丁目16-7'::text,'(047)322-4467'::text,35.72481459::float8,139.918123::float8,'玄関正面'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45456 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45481 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_04'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
