begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev16_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,installation_location text,availability text,dup bool) on commit drop;
insert into dev16_v values
('bodik-reviewed:94e08f2821dad479:0d3a8ed4c283019f2b5bb7d5'::text,'市役所第一庁舎'::text,'千葉県市川市八幡1丁目1-1'::text,'(047)712-8647'::text,35.72179702::float8,139.9310206::float8,'1階守衛室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:0d7d43e1338bc6e94a2d12b1'::text,'市役所第二庁舎分館'::text,'千葉県市川市南八幡2丁目17-7'::text,'(047)704-0058'::text,35.71397267::float8,139.9287259::float8,'2階技術管理課'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ea625ea077ff4ef9be6495bd'::text,'行徳ふれあい伝承館'::text,'千葉県市川市本行徳35-7'::text,'(047)314-8177'::text,35.6904387::float8,139.9154706::float8,'事務室内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e75d210089dbb335b8b41a20'::text,'市川考古博物館'::text,'千葉県市川市堀之内2丁目26-1'::text,'(047)373-2202'::text,35.7590073::float8,139.9120419::float8,'考古博物館ロビー前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:8f13ef4f1f6436f8142c534d'::text,'行徳野鳥観察舎あいねすと'::text,'千葉県市川市福栄4丁目22-11'::text,'(047)702-8045'::text,35.66853221::float8,139.9157757::float8,'玄関正面'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:fa483e810fdb6374c007523f'::text,'ぴあぱーく妙典'::text,'千葉県市川市下妙典941-3'::text,'(047)712-6367'::text,35.687657::float8,139.935535::float8,'公園管理棟内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:07985154953e53cc12438810'::text,'第一中学校 院内学級'::text,'千葉県市川市国府台1‐7‐5'::text,'(047)372-7850'::text,35.74511::float8,139.90751::float8,'職員室'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:80d9b3644b08395738333d2f'::text,'小塚山公園'::text,'千葉県市川市北国分3丁目2'::text,'(047)712-6367'::text,35.75863185::float8,139.907351::float8,'【屋外】トイレ外壁'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:881fb1f01efee67d20c5339a'::text,'八幡市民交流館ニコット'::text,'千葉県市川市八幡4丁目2-1'::text,'(047)321-6264'::text,35.72351021::float8,139.9302402::float8,'1階玄関ホール左側'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:6d4ddedc6da48ff4b18831fd'::text,'国府台スタジアム'::text,'千葉県市川市国府台1丁目6-4'::text,'(047)373-3111'::text,35.74423849::float8,139.906473::float8,'正面入口管理人室前'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:15f9d696b9c2b178c3e46724'::text,'セブンイレブン市川二俣一丁目店'::text,'千葉県市川市二俣1丁目13-1'::text,'(047)328-1257'::text,35.705434::float8,139.952601::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:919de9aefd7ce21dd36d5311'::text,'セブンイレブン市川妙典二丁目店'::text,'千葉県市川市妙典2丁目16-3'::text,'(047)395-4778'::text,35.69520231::float8,139.9273196::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:14e842c35f7c646925b0c291'::text,'セブンイレブン市川鬼高三丁目店'::text,'千葉県市川市鬼高3丁目12-32'::text,'(047)370-3575'::text,35.709581::float8,139.938737::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:93235aec821966beb96ac32a'::text,'セブンイレブン鬼越駅前店'::text,'千葉県市川市鬼越1丁目4-4'::text,'(047)335-3833'::text,35.719878::float8,139.937147::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:c36d62db31bb570ee63b12b7'::text,'セブンイレブン市川塩焼店'::text,'千葉県市川市塩焼1丁目10-7'::text,'(047)395-6281'::text,35.687995::float8,139.93071::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:62fa442298c2721ec1a1ddd9'::text,'セブンイレブン市川宝店'::text,'千葉県市川市宝2丁目10-14'::text,'(047)396-5454'::text,35.68062227::float8,139.9221635::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:9147ee62a36bd074d9295bc6'::text,'セブンイレブン市川田尻一丁目店'::text,'千葉県市川市田尻1丁目10-14'::text,'(047)376-6656'::text,35.70693::float8,139.928883::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:60d48e0e9d79c11fc3b94d2e'::text,'セブンイレブン市川総合病院前店'::text,'千葉県市川市菅野6丁目1-6'::text,'(047)323-7707'::text,35.732562::float8,139.920822::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ecd174d9149d7bd76fea7031'::text,'セブンイレブン市川堀之内店'::text,'千葉県市川市堀之内3丁目25-13'::text,'(047)373-0071'::text,35.76358861::float8,139.9127983::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:b1af80d5ceb8160f8f47d19e'::text,'セブンイレブン市川新田二丁目店'::text,'千葉県市川市新田2丁目15-6'::text,'(047)314-2050'::text,35.725345::float8,139.914604::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:ab6b8eb84a7ef641e78dc512'::text,'セブンイレブン八幡店'::text,'千葉県市川市八幡2丁目3-22'::text,'(047)335-3651'::text,35.723013::float8,139.929308::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:25fd0702a105b5feaffc087b'::text,'セブンイレブン南八幡店'::text,'千葉県市川市南八幡1丁目10-1'::text,'(047)377-2795'::text,35.71787::float8,139.9297::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:e1b085ba3572ec331c358e7a'::text,'セブンイレブン東菅野店'::text,'千葉県市川市東菅野3丁目1-11'::text,'(047)333-2863'::text,35.7314977::float8,139.9303782::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:6686e2ef274239e063d05674'::text,'セブンイレブン市川北方町四丁目店'::text,'千葉県市川市北方町4丁目1336-12'::text,'(047)339-2477'::text,35.731511::float8,139.944565::float8,'店舗内'::text,NULL::text,false::bool),
('bodik-reviewed:94e08f2821dad479:a9186ea2b223f5f935357aa7'::text,'セブンイレブン市川八幡三丁目店'::text,'千葉県市川市八幡3丁目3-2'::text,'(047)324-1219'::text,35.72296075::float8,139.9277611::float8,'店舗内'::text,NULL::text,false::bool);
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45556 then raise exception 'baseline changed'; end if;
if (select count(*) from dev16_v)<>25 or (select count(*) from dev16_v where not dup)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev16_v where name is null or name='' or address is null or address='' or latitude not between 20 and 46 or longitude not between 122 and 154) then raise exception 'invalid row'; end if;
if exists(select 1 from dev16_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev16_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev16_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where not b.dup and ((n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0)))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','rough',false,dup,case when dup then 'hold' else 'published' end,case when dup then '同一施設の近接名称候補。設置位置の区別を要確認' else '自治体公式オープンデータ・公式座標・利用条件・重複をdev16で確認' end,case when dup then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now() from dev16_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,source_updated_at,prefecture_code,installation_location,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','市川市'::text,address,phone,latitude,longitude,'市川市 AED設置情報（自治体公式座標・まちまもMAP dev16審査済み）'::text,'https://www.city.ichikawa.lg.jp/page/4744.html'::text,'CC BY 4.0','2026-04-01'::text::timestamptz,'12',installation_location,availability,'自治体公式データの座標（表記整形・重複除外）','verified',true,false from dev16_v where not dup;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45581 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev16_12203_ichikawa_53056_compact_08'::text as batch,25 as inserted,0 as held,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
