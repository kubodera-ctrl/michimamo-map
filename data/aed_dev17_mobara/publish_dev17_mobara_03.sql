begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev17_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,details text,mapno text) on commit drop;
insert into dev17_v values
('municipal-official-map:mobara-aed:1563','長生郡市広域市町村圏組合消防本部中央消防署','千葉県茂原市茂原598','0475-24-0119',35.42493987696296,140.2984325267356,'茂原市茂原598','1563'),
('municipal-official-map:mobara-aed:1564','長生郡市広域市町村圏組合消防本部中央消防署本納分署','千葉県茂原市本納2149-1','0475-34-2119',35.471983875825885,140.30329078390733,'茂原市本納2149-1','1564'),
('municipal-official-map:mobara-aed:1565','富士見公園（野球場）','千葉県茂原市東郷2078','0475-22-4646',35.43335795756275,140.3092949387139,'茂原市東郷2078','1565'),
('municipal-official-map:mobara-aed:1566','萩原公園','千葉県茂原市上林173-9','0475-23-6176',35.44335287335726,140.30160821577593,'茂原市上林173-9','1566'),
('municipal-official-map:mobara-aed:97','長生健康福祉センター','千葉県茂原市茂原1102-1','0475-22-5167',35.4265191,140.28649329999996,'1台、月曜から金曜、9時0分から17時0分','97'),
('municipal-official-map:mobara-aed:98','長生の森公園','千葉県茂原市押日816-1','0475-26-2474',35.457921556170675,140.26566982269287,'1台、毎日、9時0分から17時0分','98'),
('municipal-official-map:mobara-aed:99','県立長生高等学校','千葉県茂原市高師286','0475-22-3378',35.4332601,140.2980778,'2台、月曜から金曜、8時15分から21時0分','99'),
('municipal-official-map:mobara-aed:100','生涯大学校外房学園','千葉県茂原市本小轡319-1','0475-25-8228',35.4517301,140.31423070000005,'1台、月曜から金曜、8時30分から17時30分','100'),
('municipal-official-map:mobara-aed:101','県立茂原高等学校','千葉県茂原市高師1300','0475-22-4505',35.4333486,140.28576829999997,'1台、月曜から金曜、8時20分から16時50分','101'),
('municipal-official-map:mobara-aed:102','県立茂原樟陽高等学校','千葉県茂原市上林283','0475-22-3315',35.4403842,140.30374900000004,'3台（職員室・体育館・工業棟）、月曜から金曜、8時15分から16時45分','102'),
('municipal-official-map:mobara-aed:1654','茂原警察署（玄関）','千葉県茂原市早野新田7','0475-22-0110',35.42232973353018,140.31391676405562,'茂原市早野新田7 / 1台、24時間','1654'),
('municipal-official-map:mobara-aed:103','長生郡市温水センター（スポーツプラザイースト）','千葉県茂原市下永吉1815','0475-25-2181',35.40442276755323,140.31314224004745,'1台、火曜～金曜10時30分～22時、土曜10時30分～21時、日曜、祝日10時30分～19時','103'),
('municipal-official-map:mobara-aed:104','TOTOハイリビング株式会社','千葉県茂原市本納3210-1','0475-34-3555',35.4771619,140.29180399999996,'1台、月曜から金曜、8時30分から17時30分','104'),
('municipal-official-map:mobara-aed:105','茂原北陵高等学校','千葉県茂原市吉井上128','0475-34-3211',35.4821918,140.29180080000003,'3台、月曜から金曜、8時30分から17時、※校舎グラウンド口のみ屋外のため24時間','105'),
('municipal-official-map:mobara-aed:106','ムーンレイクゴルフクラブ 茂原コース','千葉県茂原市長尾1647','0475-22-8317',35.4566646,140.28117029999999,'1台、毎日、7時0分から19時0分','106'),
('municipal-official-map:mobara-aed:107','JSS茂原スポーツクラブ','千葉県茂原市北塚1068','0475-27-2580',35.4650138,140.30105400000002,'1台、月曜～木曜9時30分～21時、金曜12時～21時、土曜9時～21時、日曜9時～13時','107'),
('municipal-official-map:mobara-aed:108','真名カントリークラブ','千葉県茂原市真名1744','0475-24-5211',35.470989796361984,140.25694459676743,'1台、毎日、8時0分から18時0分','108'),
('municipal-official-map:mobara-aed:110','トヨーカラー株式会社 茂原工場','千葉県茂原市東郷1430','0475-22-2191',35.441797421102095,140.31805202364922,'1台、8時30分～17時（守衛が不在時は不可）','110'),
('municipal-official-map:mobara-aed:113','妙中鉱業株式会社','千葉県茂原市大芝452','0475-24-0140',35.4043678,140.31557040000007,'1台、月曜から金曜、8時0分から17時0分','113'),
('municipal-official-map:mobara-aed:114','茂原ショッピングプラザアスモ','千葉県茂原市高師1735','0475-25-5511',35.434976001989874,140.28763711452484,'1台、毎日10時～20時','114'),
('municipal-official-map:mobara-aed:115','株式会社ジャパンディスプレイ','千葉県茂原市早野3300','0475-23-1111',35.4180126,140.30440210000006,'1台、24時間','115'),
('municipal-official-map:mobara-aed:116','双葉電子工業株式会社 本社','千葉県茂原市大芝629','0475-24-1111',35.414444,140.3155173,'1台、月曜日～金曜日 7時～19時（休業日は使用不可）','116'),
('municipal-official-map:mobara-aed:117','富士フイルムヘルスケアマニュファクチャリング（株）茂原サイト','千葉県茂原市三ヶ谷1754','0475-26-2981',35.3963289,140.30505540000001,'1台、月曜から金曜、8時30分～16時55分','117'),
('municipal-official-map:mobara-aed:118','ロジスティード東日本（株）','千葉県茂原市下永吉255','0475-24-5171',35.4149019,140.30237740000007,'1台、9時～18時（開門時）','118'),
('municipal-official-map:mobara-aed:119','三井化学株式会社 茂原分工場','千葉県茂原市東郷1900','0475-23-0111',35.436949388798006,140.30810236930847,'1台、24時間','119');
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45956 then raise exception 'baseline changed'; end if;
if (select count(*) from dev17_v)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev17_v where name is null or name='' or address not like '千葉県茂原市%' or latitude not between 35.2 and 35.7 or longitude not between 140.0 and 140.6) then raise exception 'invalid row'; end if;
if exists(select 1 from dev17_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev17_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev17_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',false,false,'published','自治体公式AED一覧・公式施設マップ座標・範囲・重複をdev17で確認','公開DBへ反映済み',now() from dev17_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',true,false from dev17_v;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45981 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev17_mobara_03'::text as batch,25 as inserted,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
