begin;
set local lock_timeout='5s'; set local statement_timeout='30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev17_v(source_key text,name text,address text,phone text,latitude float8,longitude float8,details text,mapno text) on commit drop;
insert into dev17_v values
('municipal-official-map:mobara-aed:120','三井化学株式会社 茂原研究・開発センター','千葉県茂原市東郷1144','0475-23-0120',35.4442949,140.31016469999997,'1台、24時間','120'),
('municipal-official-map:mobara-aed:149','グループホーム ガーデンコート茂原','千葉県茂原市高師2144-11','0475-27-3336',35.4371538,140.29206750000003,'1台、24時間','149'),
('municipal-official-map:mobara-aed:150','大多喜ガス株式会社','千葉県茂原市茂原661','0475-24-0010',35.42232594667932,140.3061604499817,'1台、月曜～金曜、9時から17時30分','150'),
('municipal-official-map:mobara-aed:151','関東天然瓦斯開発株式会社 茂原鉱業所','千葉県茂原市茂原661','0475-23-1313',35.4220454,140.3068045,'1台、月曜から金曜、8時15分から17時0分','151'),
('municipal-official-map:mobara-aed:152','千葉銀行 茂原支店','千葉県茂原市茂原365-1','0475-24-2111',35.4255611,140.29317300000002,'1台、月曜から金曜、9時0分から15時0分','152'),
('municipal-official-map:mobara-aed:153','株式会社協和ハウジング 本社','千葉県茂原市東部台3-3-3','0475-23-3323',35.4247344,140.3249353,'1台、月曜から金曜、8時30分から17時30分','153'),
('municipal-official-map:mobara-aed:1648','川中島終末処理場','千葉県茂原市早野3750','0475-23-3128',35.41963623565994,140.31136752326645,null,'1648'),
('municipal-official-map:mobara-aed:1655','JR茂原駅（コンコース内 改札口）','千葉県茂原市町保1',null,35.42698217003077,140.3038627077442,'1台、毎日4時50分～0時30分','1655'),
('municipal-official-map:mobara-aed:1656','デイサービスセンター長生東（正面入口付近）','千葉県茂原市千沢842-1','0475-34-7755',35.46491942667357,140.3530858218834,'1台、月曜～土曜8時～17時（月曜は不在の場合あり）','1656'),
('municipal-official-map:mobara-aed:1657','調剤薬局ツルハドラッグ茂原店（調剤待合室）','千葉県茂原市六ツ野3870','0475-20-0250',35.42632114334318,140.3236541650332,'1台、毎日9時～24時','1657'),
('municipal-official-map:mobara-aed:1660','レコードブック茂原駅前（正面入口付近）','千葉県茂原市高師585','0475-44-7880',35.426216984109004,140.30731094618284,'茂原市高師585 / 1台、月曜～金曜8時～17時（土曜、日曜、年末年始は不可）','1660'),
('municipal-official-map:mobara-aed:1661','京葉ロジコ株式会社 茂原路線営業所（事務所内入口）','千葉県茂原市小林小林288-1','0475-22-2694',35.444068409543505,140.28330524036323,'茂原市小林小林288-1 / 1台、月曜～金曜8時～17時（祝日及び夏季休暇、年末年始は不可）','1661'),
('municipal-official-map:mobara-aed:1662','京葉ロジコ株式会社 茂原営業所（入口 受付カウンター）','千葉県茂原市東郷1865','0475-22-2693',35.43670459051853,140.31135688269123,'茂原市東郷1865 / 1台、月曜～金曜8時30分～17時30分（祝日及び夏季休暇、年末年始は不可）','1662'),
('municipal-official-map:mobara-aed:1663','京葉ロジコ株式会社 本社（入口 受付カウンター）','千葉県茂原市高師1690-1','0475-22-2361',35.436911665738904,140.28670435352205,'茂原市高師1690-1 / 1台、月曜～金曜8時30分～17時30分（祝日及び夏季休暇、年末年始は不可）','1663'),
('municipal-official-map:mobara-aed:1664','都自動車株式会社タクシー茂原営業所（事務所内点呼場）','千葉県茂原市茂原644-1','0475-22-3545',35.424480127183145,140.3034397228345,'茂原市茂原644-1 / 1台、月曜～日曜8時～1時','1664'),
('municipal-official-map:mobara-aed:1665','長生教育会館（入口外）','千葉県茂原市東郷2300-1','0475-24-9721',35.43408350671078,140.31183074188021,'茂原市東郷2300-1 / 1台、24時間','1665');
do $g$ begin
if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45981 then raise exception 'baseline changed'; end if;
if (select count(*) from dev17_v)<>16 then raise exception 'cardinality changed'; end if;
if exists(select 1 from dev17_v where name is null or name='' or address not like '千葉県茂原市%' or latitude not between 35.2 and 35.7 or longitude not between 140.0 and 140.6) then raise exception 'invalid row'; end if;
if exists(select 1 from dev17_v v join public.safety_spots p using(source_key)) or exists(select 1 from dev17_v v join public.safety_spots_nationwide_stage s using(source_key)) then raise exception 'existing source key'; end if;
if exists(select 1 from dev17_v b join public.safety_spots p on p.facility_type='aed' and p.active and not p.duplicate_candidate cross join lateral(select regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn)n where (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g')) or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002 and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3 and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))) then raise exception 'public duplicate candidate'; end if;
end $g$;
insert into public.safety_spots_nationwide_stage(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate,review_decision,review_reason,review_next_action,reviewed_at)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',false,false,'published','自治体公式AED一覧・公式施設マップ座標・範囲・重複をdev17で確認','公開DBへ反映済み',now() from dev17_v;
insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,phone,latitude,longitude,source_name,source_url,source_license,prefecture_code,availability,geocode_source,quality_status,active,duplicate_candidate)
select source_key,'aed',name,'千葉県','茂原市',address,phone,latitude,longitude,'茂原市 もばら施設マップ AED設置施設（まちまもMAP dev17審査済み）','https://www.city.mobara.chiba.jp/map/map1/map3.html?target=0-0&cacd=&mapno=','茂原市公式ウェブサイト利用条件','12',details,'茂原市公式施設マップ掲載座標（mapno='||mapno||'）','verified',true,false from dev17_v;
do $g$ begin if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate)<>45997 then raise exception 'post count mismatch'; end if; end $g$;
select 'dev17_mobara_04'::text as batch,16 as inserted,(select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
