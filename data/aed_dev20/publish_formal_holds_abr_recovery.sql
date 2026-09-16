begin;
create temp table dev20_formal_publish(source_key text primary key,latitude double precision,
 longitude double precision,geocode_source text,geocoded_title text) on commit drop;
insert into dev20_formal_publish values
('bodik-reviewed:geocoded20260914:dce12e827ff81fb1:8744711f127df4de903813bb',35.402006523,136.762694467,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加納東丸町2-9-1'),
('bodik-reviewed:geocoded20260914:6795e5fccd5862ca:f80013ac141644989b591c66',36.384363814,139.836200361,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小金井277-2'),
('bodik-reviewed:geocoded20260914:6795e5fccd5862ca:e94fe6226034aee6ebef9b56',36.386427433,139.843500836,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小金井1146-6'),
('bodik-reviewed:geocoded20260914:6795e5fccd5862ca:d06ff82c2fc8731293d236d0',36.384363814,139.836200361,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小金井277-2'),
('bodik-reviewed:badb813d950c9765:0e7866ec8310fd363f87786f',34.78113149,134.556178878,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','御津町釜屋313-1'),
('bodik-reviewed:ec9cf8240e200da6:e3b8903738d8b9fdd4ac219a',34.07969544,135.105358702,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','宮崎町486-2'),
('bodik-reviewed:ec9cf8240e200da6:a14a115dea2cacb5c1ae94e3',34.077021896,135.098350301,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','宮崎町2131'),
('bodik-reviewed:ec9cf8240e200da6:1f8036c6949cd6d2da630f1f',34.078914501,135.114325702,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','宮崎町265'),
('bodik-reviewed:ec9cf8240e200da6:ef190a5ef69aaa245d14f58d',34.080086435,135.103367152,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','宮崎町2343-82'),
('bodik-reviewed:ec9cf8240e200da6:83b02cb1fbc65a1c1fd1348e',34.079445495,135.114182082,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','宮崎町240-1'),
('bodik-reviewed:ec9cf8240e200da6:a571126e99fe6e3c9c350200',34.077333148,135.104866601,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','宮崎町581'),
('bodik-reviewed:fe5f04f6da9a6dd1:1cb3d20da643af6c07de689e',34.584992076,133.771905604,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','西中新田640'),
('bodik-reviewed:fe5f04f6da9a6dd1:75bd85dfe255fd3fc4d2c3ed',34.584992076,133.771905604,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','西中新田640'),
('bodik-reviewed:f7e1209809f1c87b:8cb2aabc91c371fc611647e2',34.685851397,133.709454315,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','秦1215'),
('bodik-reviewed:f7e1209809f1c87b:fe1b71c3711a68ed9332bf4e',34.683203679,133.768730348,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','金井戸150-1'),
('bodik-reviewed:f7e1209809f1c87b:6e9be34aae8b0dcecbfb004e',34.683203679,133.768730348,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','金井戸150-1'),
('bodik-reviewed:9e87bb6964290268:1613f0118734d40c18e2ac04',31.556668377,130.556941714,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鴨池新町6-4'),
('bodik-reviewed:9e87bb6964290268:cf87e8106954c700d707d1af',31.558323612,130.557333544,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鴨池新町10-1'),
('bodik-reviewed:f015a33c95839867:cb3ab3c79417afbc69aefc25',31.558323612,130.557333544,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鴨池新町10-1'),
('bodik-reviewed:f015a33c95839867:e8c7970518da6f7888db5faa',31.678475065,130.480178798,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','郡山町100'),
('bodik-reviewed:f015a33c95839867:15af7eeb462c601f349c0d90',31.678475065,130.480178798,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','郡山町100'),
('bodik-reviewed:f015a33c95839867:e0865f033b9fd3cee1b14b68',31.537634115,130.551599171,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','中央港新町1'),
('bodik-reviewed:f015a33c95839867:47605dd5a1ed52ebde926ba9',31.537634115,130.551599171,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','中央港新町1'),
('bodik-reviewed:fa3c20dccde8ed77:ad28241466ecf7ebd8809f72',31.421278305,130.31209436,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加世田唐仁原1202'),
('bodik-reviewed:fa3c20dccde8ed77:db88fda36a499af34bd53c69',31.421278305,130.31209436,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加世田唐仁原1202'),
('bodik-reviewed:7fdda77b7be0f17f:64c96d4c6c3ade3818a80653',32.45873692,130.193368252,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東浜町8-1'),
('bodik-reviewed:7fdda77b7be0f17f:e51e7a6508b63ff7d3353905',32.45873692,130.193368252,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東浜町8-1'),
('bodik-reviewed:7fdda77b7be0f17f:f0d39383b62556b8a84904cd',32.45873692,130.193368252,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東浜町8-1'),
('bodik-reviewed:7fdda77b7be0f17f:e45ed69c9fcad332e091eaa5',32.45873692,130.193368252,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東浜町8-1'),
('bodik-reviewed:7fdda77b7be0f17f:927e5617f9f86fea084cb022',32.45873692,130.193368252,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東浜町8-1'),
('bodik-reviewed:7fdda77b7be0f17f:d1c72214d2ad8973b994f370',32.464985213,130.2038352,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','本渡町広瀬5-110'),
('bodik-reviewed:7fdda77b7be0f17f:767cba3299b2a0e58312a224',32.464985213,130.2038352,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','本渡町広瀬5-110'),
('bodik-reviewed:7fdda77b7be0f17f:62d92e05c07d2c05eabca60a',32.452066102,130.199639814,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東町3'),
('bodik-reviewed:7fdda77b7be0f17f:90b39ff178e16067379dec5a',32.452066102,130.199639814,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','東町3'),
('bodik-reviewed:7fdda77b7be0f17f:6151c37cbd09b346e1f42f8c',32.346008006,130.34379092,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','御所浦町御所浦3215-2'),
('bodik-reviewed:7fdda77b7be0f17f:73d9d093da41a6bf32ad01f6',32.346008006,130.34379092,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','御所浦町御所浦3215-2'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:de1cb73abea0f1df1a081bd8',31.742300839,130.669989731,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加治木町新富町131'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:9bc78304135b407fe1947ea0',31.742300839,130.669989731,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加治木町新富町131'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:9ee40731473babcc2de6a9fa',31.707579894,130.616662185,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','脇元1066-1'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:264e28e4f315c341068b2044',31.707579894,130.616662185,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','脇元1066-1'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:cf6f1327efd3fb0fdbca6dd0',31.721714957,130.64676981,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加治木町木田1395-16'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:cc5e53bbbba3aa34afcc68ba',31.721714957,130.64676981,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加治木町木田1395-16'),
('bodik-reviewed:geocoded20260915:7befcf10d7f3e401:b6e35a46f84a1a4080e8d3e9',31.721714957,130.64676981,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','加治木町木田1395-16'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:be70ba2fe813557fff6e0f4e',33.155116223,129.731824847,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','干尽町2-5'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:f9eedbf1ad46c866d03b0395',33.155116223,129.731824847,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','干尽町2-5'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:64a0aae08a4ac617835f7ca5',33.270451233,129.692227713,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町前岳27-3'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:20fdf5e7e18a460dde7e2526',33.270451233,129.692227713,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町前岳27-3'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:40b625cecd16e39a80f398bd',33.285778786,129.69927296,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町直谷1030'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:f8f628ff8a74a3800e4ae29d',33.285778786,129.69927296,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町直谷1030'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:9a60f7c21ac1d997ae8fd457',33.256999787,129.753249621,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','世知原町栗迎194-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:b23d00aeaa9adf2b5374e607',33.256999787,129.753249621,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','世知原町栗迎194-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:5c62c7ec40853cec7d8d09be',33.226861632,129.619309378,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小佐々町田原290-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:fc9855e614561f9dd8d6dd3d',33.226861632,129.619309378,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小佐々町田原290-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:ca7cff6571a217672b33ec9b',33.218907046,129.574020831,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小佐々町楠泊526'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:13b027d554cd30e77b847fef',33.218907046,129.574020831,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小佐々町楠泊526'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:4bd9a1a2d9fc98554837653d',33.308791128,129.633684687,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','江迎町中尾126'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:f1d69e1d05d016b0b49ed2bd',33.308791128,129.633684687,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','江迎町中尾126'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:2aed3ca685ea0594617011f6',33.284726228,129.668589431,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','江迎町猪調1000'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:d06414ce4aa32c5acbae7086',33.284726228,129.668589431,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','江迎町猪調1000'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:0b87ce063400c836454d217b',33.298610001,129.615783871,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鹿町町深江730-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:5579c6895911a56150d978e5',33.298610001,129.615783871,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鹿町町深江730-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:337e6da38bba7e196faecc0b',33.265669819,129.581955586,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鹿町町下歌ヶ浦791-11'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:6cd327f7d71fe7e5255a3eb6',33.265669819,129.581955586,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鹿町町下歌ヶ浦791-11'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:7d97248f591ae91cb59000dc',33.155746119,129.729661209,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','干尽町2-10'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:5f5341bf545ecb179618c95e',33.155746119,129.729661209,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','干尽町2-10'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:34d28078e886962685198a72',33.2547915,129.753313051,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','世知原町栗迎132-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:69b92a3702ba3a301f995c04',33.2547915,129.753313051,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','世知原町栗迎132-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:aecd2c0647cf4c39f8c303d4',33.2547915,129.753313051,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','世知原町栗迎132-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:27ae78a0de6f953b3aa15ee1',33.269752328,129.691350313,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町前岳3-2'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:04482f26f1d315d6161cd833',33.269752328,129.691350313,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町前岳3-2'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:207f9e50066155929d65ea20',33.269752328,129.691350313,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','吉井町前岳3-2'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:3a56c47aebfcd6e4bbc94e5d',33.213484025,129.59947197,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小佐々町西川内132'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:0c4fca8b539e7fd612de94f7',33.213484025,129.59947197,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','小佐々町西川内132'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:5e044fdc0c33275d01ee6918',33.278854265,129.590347274,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鹿町町下歌ヶ浦1-16'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:52b1e2723af3496b1115123b',33.278854265,129.590347274,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','鹿町町下歌ヶ浦1-16'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:6de9ade7276340bcd759dadd',33.183223187,129.722244052,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','八幡町1-10'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:af607b4010559b04d36ce801',33.183223187,129.722244052,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','八幡町1-10'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:a095aaa384c8797543ea2b73',33.183223187,129.722244052,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','八幡町1-10'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:c3cbbfe152b843d0aedd0ac5',33.183223187,129.722244052,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','八幡町1-10'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:0eb6278f88511cd3dd016300',33.178611343,129.717182195,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','高砂町5-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:7ce677d307766a445b464ab7',33.178611343,129.717182195,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','高砂町5-1'),
('bodik-reviewed:geocoded20260915:60fdb2c674a4ae8a:a55f2f9d1290a4bdaa09e8ac',33.178611343,129.717182195,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','高砂町5-1'),
('bodik-reviewed:geocoded20260915:86d0759c7028df70:5a9a84620a68eb873e602377',32.647493743,130.684117209,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','松橋町大野85'),
('bodik-reviewed:geocoded20260915:86d0759c7028df70:6dda3f3e47ea9d561a16b52a',32.647493743,130.684117209,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','松橋町大野85'),
('bodik-reviewed:55cfbf991de1cbb5:25cce96f36e138e5cf9d85d0',35.864630643,139.744791645,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','戸塚南4-10-1'),
('bodik-reviewed:d6127a67ec81f505:021246934d21bc3ad42d1d56',35.840740824,139.863854309,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','泉3-4'),
('municipal-open-data:sodegaura-aed:AED-67',35.441813367,139.998133962,'デジタル庁アドレス・ベース・レジストリ地番詳細座標','蔵波台4-19-1');
do $$ begin
 if (select count(*) from dev20_formal_publish) <> 87 then raise exception 'candidate count changed'; end if;
 if exists(select 1 from dev20_formal_publish where latitude not between 20 and 46 or longitude not between 122 and 154)
 then raise exception 'invalid coordinates'; end if;
end $$;
update public.safety_spots_nationwide_stage s set
 latitude=c.latitude,longitude=c.longitude,geocode_source=c.geocode_source,geocoded_title=c.geocoded_title,
 quality_status='verified',review_decision='published',
 review_reason='開発20: デジタル庁ABR地番詳細座標で番地まで厳格一致。既存公開データとの同一設置場所重複なし',
 review_next_action='自治体原票またはABR更新時に差分確認',reviewed_at=now()
from dev20_formal_publish c where s.source_key=c.source_key;
insert into public.safety_spots(
 source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,latitude,longitude,
 source_name,source_url,source_date,source_license,geocode_source,geocoded_title,active,
 source_external_id,prefecture_code,installation_location,availability,source_updated_at,
 imported_at,duplicate_candidate,duplicate_group_key,quality_status)
select s.source_key,s.facility_type,s.name,s.prefecture,s.municipality,s.address,s.phone,s.parent_name,
 s.latitude,s.longitude,s.source_name,s.source_url,s.source_date,s.source_license,s.geocode_source,
 s.geocoded_title,true,s.source_external_id,s.prefecture_code,s.installation_location,s.availability,
 s.source_updated_at,now(),false,null,'verified'
from public.safety_spots_nationwide_stage s join dev20_formal_publish c using(source_key)
on conflict(source_key) do update set
 name=excluded.name,address=excluded.address,phone=excluded.phone,parent_name=excluded.parent_name,
 latitude=excluded.latitude,longitude=excluded.longitude,source_name=excluded.source_name,
 source_url=excluded.source_url,source_date=excluded.source_date,source_license=excluded.source_license,
 geocode_source=excluded.geocode_source,geocoded_title=excluded.geocoded_title,active=true,
 source_external_id=excluded.source_external_id,prefecture_code=excluded.prefecture_code,
 installation_location=excluded.installation_location,availability=excluded.availability,
 source_updated_at=excluded.source_updated_at,duplicate_candidate=false,duplicate_group_key=null,
 quality_status='verified',updated_at=now();
create temp table dev20_formal_duplicate(source_key text primary key) on commit drop;
insert into dev20_formal_duplicate values ('bodik-reviewed:badb813d950c9765:38b37e1c5227266244bb76df');
update public.safety_spots_nationwide_stage s set review_decision='duplicate',duplicate_candidate=true,
 quality_status='duplicate',review_reason='開発20: 同一住所・設置位置なしで施設名が法人接頭辞のみ異なる同一AED候補',
 review_next_action='元データ更新で設置位置の区別が追加された場合のみ再審査',reviewed_at=now()
from dev20_formal_duplicate d where s.source_key=d.source_key;
do $$ begin
 if (select count(*) from public.safety_spots p join dev20_formal_publish c using(source_key)
     where p.active and p.facility_type='aed') <> 87 then raise exception 'post-insert verification failed'; end if;
end $$;
commit;
