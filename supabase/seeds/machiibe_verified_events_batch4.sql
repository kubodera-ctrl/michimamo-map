-- まちイベ verified production seed batch 4.
-- Rechecked against official organizer/municipal/venue pages on 2026-09-23.
-- Factual metadata only. No source prose, logos, or event images are copied.
-- Idempotent: safe to run repeatedly after v1 + i18n foundation migrations.

begin;

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,data_url,prefecture,municipality,
  event_use_allowed,terms_review_status,acquisition_mode,automated_fetch_allowed,
  coverage_scope,coverage_estimate,image_policy,fetch_status,last_success_at,notes,is_active,last_reviewed_at
) values
('official-sogo-yokohama','そごう横浜店・そごう美術館','manual',
 'https://www.sogo-seibu.jp/yokohama/','https://www.sogo-seibu.jp/yokohama/topics/sogo-museum-suzuki-shintaro',
 '神奈川県','横浜市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),
 'Official department store/museum pages used as factual source; no source prose/media copied.',true,now()),
('official-katori-city','香取市','manual',
 'https://www.city.katori.lg.jp/','https://www.city.katori.lg.jp/sightseeing/matsuri/introduction/aki.html',
 '千葉県','香取市',true,'reviewed_facts_only','manual_facts_only',false,'municipality',null,'not_used','healthy',now(),
 'Official municipal festival page used as factual source; no source prose/media copied.',true,now()),
('official-kawasaki-city','川崎市','manual',
 'https://www.city.kawasaki.jp/','https://www.city.kawasaki.jp/280/page/0000117559.html',
 '神奈川県','川崎市',true,'reviewed_facts_only','manual_facts_only',false,'municipality',null,'not_used','healthy',now(),
 'Official municipal event page used as factual source; no source prose/media copied.',true,now()),
('official-kawasaki-minato','川崎みなと祭り実行委員会','manual',
 'https://kawasakiminato.com/','https://kawasakiminato.com/',
 '神奈川県','川崎市',true,'reviewed_facts_only','manual_facts_only',false,'single_event',null,'not_used','healthy',now(),
 'Official festival site used as factual source; no source prose/media copied.',true,now())
on conflict(source_key) do update set
  name=excluded.name,
  homepage_url=excluded.homepage_url,
  data_url=excluded.data_url,
  prefecture=excluded.prefecture,
  municipality=excluded.municipality,
  event_use_allowed=true,
  terms_review_status='reviewed_facts_only',
  acquisition_mode='manual_facts_only',
  automated_fetch_allowed=false,
  coverage_scope=excluded.coverage_scope,
  coverage_estimate=null,
  image_policy='not_used',
  fetch_status='healthy',
  last_success_at=now(),
  notes=excluded.notes,
  is_active=true,
  last_reviewed_at=now(),
  updated_at=now();

insert into public.events(
  slug,title,start_date,end_date,start_time,end_time,all_day,schedule_type,
  venue_name,postal_code,prefecture,municipality,address,location_precision,location_verified,
  price_text,price_type,is_free,reservation_required,reservation_text,organizer_name,official_url,
  category_keys,age_group_keys,indoor,audience_intent,audience_intent_verified,
  accessibility_keys,accessibility_notes,
  source_id,source_event_key,source_page_url,
  verification_status,publication_status,dedupe_key,last_verified_at,image_usage_status
) values
(
  'sogo-suzuki-shintaro-2026','カラフルパレット 鈴木信太郎',
  '2026-09-12','2026-10-12','10:00','20:00',false,'continuous',
  'そごう美術館（そごう横浜店 6階）','220-8510','神奈川県','横浜市','西区高島2-18-1','exact_address',true,
  '一般1,200円／大学・高校生1,000円／中学生以下無料。障がい者手帳各種所持者と同伴者1名は無料',
  'partly_free',null,false,'入館は閉館30分前まで。9月16日は19:00閉館','そごう美術館',
  'https://www.sogo-seibu.jp/yokohama/topics/sogo-museum-suzuki-shintaro',
  array['art'],'{}',true,'general',false,
  array['disability_discount','companion_support'],'障がい者手帳各種所持者と同伴者1名は入館無料。',
  (select id from public.regional_sources where source_key='official-sogo-yokohama'),
  'sogo-museum-suzuki-shintaro-2026','https://www.sogo-seibu.jp/yokohama/topics/sogo-museum-suzuki-shintaro',
  'verified','published','sogo-suzuki-shintaro-2026',now(),'not_used'
),
(
  'solamachi-oktoberfest-2026','オクトーバーフェストin東京スカイツリータウン®2026',
  '2026-09-19','2026-10-26','11:00','21:00',false,'continuous',
  '東京ソラマチ 4F スカイアリーナ','131-0045','東京都','墨田区','押上1-1-2','exact_address',true,
  null,'unknown',null,false,'金・土および9月19日～23日は21:30まで。ラストオーダーは通常20:30、延長日は21:00',null,
  'https://www.tokyo-solamachi.jp/event/2811/',
  array['food','festival'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokyo-solamachi'),
  'event-2811','https://www.tokyo-solamachi.jp/event/2811/',
  'verified','published','solamachi-oktoberfest-2026',now(),'not_used'
),
(
  'sawara-autumn-festival-2026','佐原の大祭 秋祭り',
  '2026-10-09','2026-10-11','10:00','22:00',false,'continuous',
  '香取市佐原 新宿地区・佐原信用金庫ステージ広場ほか',null,'千葉県','香取市',null,'unknown',false,
  null,'unknown',null,false,'雨天決行。山車運行・演目は日ごとの公式日程を確認','佐原の大祭実行委員会',
  'https://www.city.katori.lg.jp/sightseeing/matsuri/introduction/aki.html',
  array['festival','art'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-katori-city'),
  'sawara-autumn-2026','https://www.city.katori.lg.jp/sightseeing/matsuri/introduction/aki.html',
  'verified','published','sawara-autumn-festival-2026',now(),'not_used'
),
(
  'kawasaki-tamagawa-fireworks-2026','第85回 川崎市制記念多摩川花火大会',
  '2026-10-03','2026-10-03','18:00','19:00',false,'single',
  '多摩川河川敷（二子橋～第三京浜道路間）',null,'神奈川県','川崎市',null,'approximate',false,
  null,'unknown',null,false,'荒天中止','川崎市・一般社団法人川崎市観光協会・高津観光協会',
  'https://www.city.kawasaki.jp/280/page/0000117559.html',
  array['fireworks','festival'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-kawasaki-city'),
  'tamagawa-fireworks-85-2026','https://www.city.kawasaki.jp/280/page/0000117559.html',
  'verified','published','kawasaki-tamagawa-fireworks-2026',now(),'not_used'
),
(
  'kawasaki-port-festival-2026','川崎港開港75周年記念 第53回川崎みなと祭り',
  '2026-10-10','2026-10-11',null,null,true,'continuous',
  '川崎マリエン周辺・東扇島東公園',null,'神奈川県','川崎市',null,'unknown',false,
  null,'unknown',null,false,'雨天決行・荒天中止。各企画の時間や参加条件は公式サイトで確認',
  '川崎市・川崎商工会議所・公益社団法人川崎港振興協会',
  'https://kawasakiminato.com/',
  array['festival','learning','experience'],'{}',null,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-kawasaki-minato'),
  'kawasaki-minato-53-2026','https://kawasakiminato.com/',
  'verified','published','kawasaki-port-festival-2026',now(),'not_used'
)
on conflict(slug) do update set
  title=excluded.title,
  start_date=excluded.start_date,
  end_date=excluded.end_date,
  start_time=excluded.start_time,
  end_time=excluded.end_time,
  all_day=excluded.all_day,
  schedule_type=excluded.schedule_type,
  venue_name=excluded.venue_name,
  postal_code=excluded.postal_code,
  prefecture=excluded.prefecture,
  municipality=excluded.municipality,
  address=excluded.address,
  location_precision=excluded.location_precision,
  location_verified=excluded.location_verified,
  price_text=excluded.price_text,
  price_type=excluded.price_type,
  is_free=excluded.is_free,
  reservation_required=excluded.reservation_required,
  reservation_text=excluded.reservation_text,
  organizer_name=excluded.organizer_name,
  official_url=excluded.official_url,
  category_keys=excluded.category_keys,
  age_group_keys=excluded.age_group_keys,
  indoor=excluded.indoor,
  audience_intent=excluded.audience_intent,
  audience_intent_verified=excluded.audience_intent_verified,
  accessibility_keys=excluded.accessibility_keys,
  accessibility_notes=excluded.accessibility_notes,
  source_id=excluded.source_id,
  source_event_key=excluded.source_event_key,
  source_page_url=excluded.source_page_url,
  verification_status='verified',
  publication_status='published',
  dedupe_key=excluded.dedupe_key,
  last_verified_at=now(),
  image_usage_status='not_used',
  updated_at=now();

insert into public.event_source_records(
  source_id,source_event_key,event_id,source_title,source_start_date,source_end_date,
  source_venue_name,source_url,normalization_status,fetched_at,source_updated_at
)
select
  e.source_id,e.source_event_key,e.id,e.title,e.start_date,e.end_date,
  e.venue_name,e.source_page_url,'normalized',now(),e.source_updated_at
from public.events e
where e.slug in (
  'sogo-suzuki-shintaro-2026',
  'solamachi-oktoberfest-2026',
  'sawara-autumn-festival-2026',
  'kawasaki-tamagawa-fireworks-2026',
  'kawasaki-port-festival-2026'
)
on conflict(source_id,source_event_key) do update set
  event_id=excluded.event_id,
  source_title=excluded.source_title,
  source_start_date=excluded.source_start_date,
  source_end_date=excluded.source_end_date,
  source_venue_name=excluded.source_venue_name,
  source_url=excluded.source_url,
  normalization_status='normalized',
  fetched_at=excluded.fetched_at,
  source_updated_at=excluded.source_updated_at,
  updated_at=now();

update public.events
set venue_type_keys=array['mall','culture_public','event_venue_indoor']
where slug='sogo-suzuki-shintaro-2026';

update public.events
set venue_type_keys=array['mall','event_venue_outdoor']
where slug='solamachi-oktoberfest-2026';

update public.events
set venue_type_keys=array['event_venue_outdoor']
where slug in ('sawara-autumn-festival-2026','kawasaki-tamagawa-fireworks-2026');

update public.events
set venue_type_keys=array['park_plaza','culture_public','event_venue_outdoor']
where slug='kawasaki-port-festival-2026';

-- Official English page exists for this event. Store only short factual fields;
-- do not copy descriptive source prose.
insert into public.event_translations(
  event_id,locale,title,summary,venue_name,translation_source,review_status,source_url,reviewed_at
)
select
  e.id,
  'en',
  'Oktoberfest in TOKYO SKYTREE TOWN ®2026',
  null,
  'TOKYO Solamachi 4F Sky Arena',
  'provider',
  'approved',
  'https://en.www.tokyo-solamachi.jp/event/2811/',
  now()
from public.events e
where e.slug='solamachi-oktoberfest-2026'
on conflict(event_id,locale) do update set
  title=excluded.title,
  summary=excluded.summary,
  venue_name=excluded.venue_name,
  translation_source='provider',
  review_status='approved',
  source_url=excluded.source_url,
  reviewed_at=now(),
  updated_at=now();

commit;
