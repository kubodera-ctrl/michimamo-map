begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev17_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,details text,mapno text) on commit drop;
insert into dev17_v values
('municipal-official-map:mobara-aed:96','二宮小学校','千葉県茂原市緑ヶ丘4-38','0475-22-0789',35.43969631515839,140.2559870481491,'1台、月曜から金曜、8時30分から17時0分','96'),
('municipal-official-map:mobara-aed:121','総合市民センター','千葉県茂原市町保13-20','0475-24-9511',35.4311356,140.30310759999998,'1台、毎日、8時30分から19時0分','121'),
('municipal-official-map:mobara-aed:122','豊岡福祉センター','千葉県茂原市粟生野2675-4','0475-34-8321',35.47666470973418,140.35394668579102,'1台、毎日、8時30分から19時0分','122'),
('municipal-official-map:mobara-aed:123','五郷福祉センター','千葉県茂原市綱島656','0475-25-7880',35.4110518,140.28066060000003,'1台、毎日、8時30分から19時0分','123'),
('municipal-official-map:mobara-aed:124','豊田福祉センター','千葉県茂原市長尾148','0475-26-1105',35.4562953,140.29149430000007,'1台、毎日、8時30分から19時0分','124'),
('municipal-official-map:mobara-aed:125','二宮福祉センター','千葉県茂原市国府関1683-1','0475-26-3740',35.44803479999999,140.26033659999996,'1台、毎日、8時30分から19時0分','125'),
('municipal-official-map:mobara-aed:126','東郷福祉センター','千葉県茂原市谷本1887-1','0475-25-5882',35.4416874,140.32493210000007,'1台、毎日、8時30分から19時0分','126'),
('municipal-official-map:mobara-aed:127','福祉作業所 あゆみの家','千葉県茂原市本小轡319-1','0475-24-9135',35.45144563347687,140.31375914812088,'1台、月曜から金曜、9時0分から16時0分','127'),
('municipal-official-map:mobara-aed:128','東郷保育所','千葉県茂原市谷本1795','0475-22-2832',35.4460313,140.32481269999994,'1台、月曜から土曜、8時0分から16時0分（土曜正午まで）','128'),
('municipal-official-map:mobara-aed:129','豊田保育所','千葉県茂原市長尾2103-1','0475-22-5056',35.4543068,140.29175829999997,'1台、月曜から土曜、8時0分から16時0分（土曜正午まで）','129'),
('municipal-official-map:mobara-aed:130','鶴枝保育所','千葉県茂原市上永吉1013-1','0475-22-4709',35.3982987,140.2975808,'1台、月曜から土曜、8時0分から16時0分（土曜正午まで）','130'),
('municipal-official-map:mobara-aed:131','二宮保育所','千葉県茂原市国府関1536-1','0475-22-4894',35.451609504344965,140.25961741805077,'1台、月曜から土曜、8時0分から16時0分（土曜正午まで）','131'),
('municipal-official-map:mobara-aed:134','町保保育所','千葉県茂原市高師555-28','0475-22-2544',35.4289861,140.30834019999998,'1台、月曜から土曜、8時0分から16時0分（土曜正午まで）','134'),
('municipal-official-map:mobara-aed:135','朝日の森保育所','千葉県茂原市茂原1016','0475-22-3126',35.4250472,140.2902428,'1台、月曜から土曜、8時0分から16時0分（土曜正午まで）','135'),
('municipal-official-map:mobara-aed:137','学校給食センター','千葉県茂原市下永吉505-1','0475-24-6920',35.414403794151085,140.3113213063876,'1台、月曜から金曜、8時30分から16時45分','137'),
('municipal-official-map:mobara-aed:139','鶴枝公民館','千葉県茂原市上永吉1012','0475-25-1834',35.3955157,140.29702240000006,'1台、毎日、8時30分から17時0分','139'),
('municipal-official-map:mobara-aed:140','図書館','千葉県茂原市高師1735（2階）','0475-23-6151',35.42678691342849,140.30308663845062,'毎日10時から19時','140'),
('municipal-official-map:mobara-aed:141','美術館・郷土資料館','千葉県茂原市高師1345-1','0475-26-2131',35.4301985884818,140.2803549170494,'1台、毎日、9時0分から17時0分','141'),
('municipal-official-map:mobara-aed:144','新茂原幼稚園','千葉県茂原市上林56-2','0475-24-8710',35.4471748,140.30125469999996,'1台、月曜から金曜、8時30分から17時0分','144'),
('municipal-official-map:mobara-aed:145','旧中の島幼稚園','千葉県茂原市下永吉1056-2',null,35.40885840000001,140.30359950000002,'1台、月曜から金曜、8時30分から17時0分','145'),
('municipal-official-map:mobara-aed:146','社会教育センター／青少年指導センター','千葉県茂原市早野17-1','0475-22-4466',35.41660447870464,140.276818127654,'1台、月曜から金曜、8時30分から17時0分','146'),
('municipal-official-map:mobara-aed:147','保健センター','千葉県茂原市高師3001','0475-25-1725',35.4375844,140.29503650000004,'1台、月曜から金曜、8時30分から17時0分','147'),
('municipal-official-map:mobara-aed:148','東部台文化会館','千葉県茂原市東部台1-7-15','0475-23-8711',35.42114782554209,140.31837791204453,'1台、毎日、9時0分から21時0分','148'),
('municipal-official-map:mobara-aed:1561','長生郡市広域市町村圏組合','千葉県茂原市下永吉2101','0475-23-0107',35.403713114525054,140.31298870321086,'茂原市下永吉2101','1561'),
('municipal-official-map:mobara-aed:1562','長生郡市広域市町村圏組合水道部','千葉県茂原市高師395-2','0475-23-9481',35.4343589649869,140.30242788023162,'茂原市高師395-2','1562');
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45931 then raise exception 'baseline changed'; end if;
if (select count(*) from dev17_v)<>25 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev17_v where name is null or name='' or address not like '千葉県茂原市%' or latitude not between 35.2 and 35.7 or longitude not between 140.0 and 140.6) then raise exception 'invalid row'; end if;
if exists(select 1 from dev17_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev17_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev17_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',false,false,'published','自治体公式AED一覧・公式施設マップ座標・範囲・重複をdev17で確認','公開DBへ反映済み',now() from dev17_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',true,false from dev17_v;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45956 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev17_mobara_02'::text as batch,25 as inserted,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
