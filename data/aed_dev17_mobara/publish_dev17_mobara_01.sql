begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev17_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,details text,mapno text) on commit drop;
insert into dev17_v values
('municipal-official-map:mobara-aed:72','茂原市役所','千葉県茂原市道表1','0475-23-2111',35.4282133,140.28809590000003,'3台（庁舎1階、2階、8階）、24時間（閉庁時は西入口へ）','72'),
('municipal-official-map:mobara-aed:73','茂原市役所本納支所（ほのおか館）','千葉県茂原市本納1741-1','0475-34-2111',35.483881,140.30608010000003,'1台、毎日8時30分から17時15分','73'),
('municipal-official-map:mobara-aed:74','茂原市市民体育館','千葉県茂原市高師2165','0475-23-2811',35.4387259,140.2951253,'1台、毎日9時～21時（年末年始は不可）','74'),
('municipal-official-map:mobara-aed:75','富士見公園（管理棟）','千葉県茂原市東郷2078','0475-22-4646',35.43229884955205,140.30991554260254,'1台','75'),
('municipal-official-map:mobara-aed:76','東中学校','千葉県茂原市東郷301','0475-24-2141',35.435441,140.31984669999997,'1台、月曜から金曜、8時30分から17時0分','76'),
('municipal-official-map:mobara-aed:77','冨士見中学校','千葉県茂原市押日1468','0475-23-7145',35.44376299266562,140.2795958518982,'1台、月曜から金曜、8時30分から17時0分','77'),
('municipal-official-map:mobara-aed:78','茂原中学校','千葉県茂原市高師427','0475-22-2320',35.4391261,140.30351300000007,'1台、月曜から金曜、8時30分から17時0分','78'),
('municipal-official-map:mobara-aed:79','南中学校','千葉県茂原市上永吉1185-2','0475-23-8825',35.4061196,140.2945757,'1台、月曜から金曜、8時30分から17時0分','79'),
('municipal-official-map:mobara-aed:80','本納中学校','千葉県茂原市本納1623','0475-34-2074',35.4863585,140.30732149999994,'1台、月曜から金曜、8時30分から17時0分','80'),
('municipal-official-map:mobara-aed:81','旧早野中学校','千葉県茂原市早野206-1',null,35.4163455,140.2807745,'1台、施設開放利用時、避難所開設時','81'),
('municipal-official-map:mobara-aed:82','旧西陵中学校','千葉県茂原市緑ヶ丘1-53',null,35.4399887,140.26182029999995,'1台、施設開放利用時、避難所開設時','82'),
('municipal-official-map:mobara-aed:83','東郷小学校','千葉県茂原市谷本142','0475-22-2834',35.4474173,140.32735130000003,'1台、月曜から金曜、8時30分から17時0分','83'),
('municipal-official-map:mobara-aed:84','豊田小学校','千葉県茂原市長尾156','0475-22-3779',35.4558232,140.2926053,'1台、月曜から金曜、8時30分から17時0分','84'),
('municipal-official-map:mobara-aed:85','旧二宮小学校','千葉県茂原市国府関1415-1',null,35.45060110000001,140.25786170000003,'1台、避難所開設時','85'),
('municipal-official-map:mobara-aed:86','茂原小学校','千葉県茂原市茂原614','0475-23-5155',35.4258085,140.29930539999998,'1台、月曜から金曜、8時30分から17時0分','86'),
('municipal-official-map:mobara-aed:87','西小学校','千葉県茂原市茂原1229-1','0475-22-3719',35.4270523,140.28371300000003,'1台、月曜から金曜、8時30分から17時0分','87'),
('municipal-official-map:mobara-aed:88','五郷小学校','千葉県茂原市綱島1185','0475-24-1161',35.4160787,140.2770554,'1台、月曜から金曜、8時30分から17時0分','88'),
('municipal-official-map:mobara-aed:89','鶴枝小学校','千葉県茂原市上永吉955','0475-22-2829',35.3951408,140.2980973,'1台、月曜から金曜、8時30分から17時0分','89'),
('municipal-official-map:mobara-aed:90','萩原小学校','千葉県茂原市萩原町1-17','0475-24-2161',35.4385455,140.29997179999998,'1台、月曜から金曜、8時30分から17時0分','90'),
('municipal-official-map:mobara-aed:91','中の島小学校','千葉県茂原市中の島町451','0475-22-3910',35.4098862,140.30965709999998,'1台、月曜から金曜、8時30分から17時0分','91'),
('municipal-official-map:mobara-aed:92','本納小学校','千葉県茂原市本納1623','0475-34-2031',35.486731258376956,140.30796819057258,'1台、月曜から金曜、8時30分から17時0分','92'),
('municipal-official-map:mobara-aed:94','豊岡小学校','千葉県茂原市弓渡255','0475-34-7757',35.4753563,140.34955390000005,'1台、月曜から金曜、8時30分から17時0分','94'),
('municipal-official-map:mobara-aed:95','東部小学校','千葉県茂原市東部台1-9-1','0475-23-5184',35.4223568,140.3184251,'1台、月曜から金曜、8時30分から17時0分','95'),
('municipal-official-map:mobara-aed:1636','旧本納小学校','千葉県茂原市本納1987',null,35.4832176888467,140.3030536968884,'1台、施設開放利用時','1636'),
('municipal-official-map:mobara-aed:1637','旧新治小学校','千葉県茂原市下太田150',null,35.48153955614562,140.28040152481955,'1台、施設開放利用時、避難所開設時','1637');
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45906 then raise exception 'baseline changed'; end if;
if (select count(*) from dev17_v)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev17_v where name is null or name='' or address not like '千葉県茂原市%' or latitude not between 35.2 and 35.7 or longitude not between 140.0 and 140.6) then raise exception 'invalid row'; end if;
if exists(select 1 from dev17_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev17_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev17_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',false,false,'published','自治体公式AED一覧・公式施設マップ座標・範囲・重複をdev17で確認','公開DBへ反映済み',now() from dev17_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',true,false from dev17_v;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45931 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev17_mobara_01'::text as batch,25 as inserted,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
