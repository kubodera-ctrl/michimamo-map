-- まちイベ verified production seed batch 5.
-- Rechecked against official venue/operator pages on 2026-09-23.
-- Only confirmed facts are stored; unknown price/time/location details remain unknown.
-- No source prose, logos, or event images are copied.

begin;

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,data_url,prefecture,municipality,
  event_use_allowed,terms_review_status,acquisition_mode,automated_fetch_allowed,
  coverage_scope,coverage_estimate,image_policy,fetch_status,last_success_at,notes,is_active,last_reviewed_at
) values
('official-seibuen','西武園ゆうえんち','manual',
 'https://www.seibuen-amusement-park.jp/','https://www.seibuen-amusement-park.jp/event/index.html',
 '埼玉県','所沢市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),
 'Official theme park event/news pages used as factual source; no source prose/media copied.',true,now()),
('official-sudo-farm','須藤牧場 生シェイク祭り','manual',
 'https://www.sudo-farm.com/','https://www.sudo-farm.com/stamp-rally/stamp-book/list-boso?city=1',
 '千葉県',null,true,'reviewed_facts_only','manual_facts_only',false,'prefecture_multi_venue',null,'not_used','healthy',now(),
 'Official organizer participant pages used as factual source; no source prose/media copied.',true,now())
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
  venue_name,prefecture,municipality,address,location_precision,location_verified,
  price_text,price_type,is_free,reservation_required,reservation_text,organizer_name,official_url,
  category_keys,age_group_keys,indoor,audience_intent,audience_intent_verified,
  accessibility_keys,accessibility_notes,
  source_id,source_event_key,source_page_url,
  verification_status,publication_status,dedupe_key,last_verified_at,image_usage_status
) values
(
  'seibuen-sidem-2026','アイドルマスター SideM 超!!レトローズパーティ',
  '2026-10-30','2026-12-01',null,null,true,'continuous',
  '西武園ゆうえんち','埼玉県','所沢市',null,'unknown',false,
  null,'unknown',null,false,'入園・個別企画・チケット条件は公式案内を確認','西武園ゆうえんち',
  'https://www.seibuen-amusement-park.jp/event/index.html',
  array['entertainment'],'{}',null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-seibuen'),
  'sidem-super-retrose-party-2026','https://www.seibuen-amusement-park.jp/event/index.html',
  'verified','published','seibuen-sidem-2026',now(),'not_used'
),
(
  'seibuen-wanwan-halloween-2026','わんわん西武園ゆうえんち ～わんだふるハロウィン～',
  '2026-10-23','2026-10-25',null,null,true,'continuous',
  '西武園ゆうえんち','埼玉県','所沢市',null,'unknown',false,
  null,'unknown',null,false,'入園・愛犬同伴条件・個別企画は公式案内を確認','西武園ゆうえんち',
  'https://www.seibuen-amusement-park.jp/event/index.html',
  array['entertainment'],'{}',null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-seibuen'),
  'wanwan-halloween-2026','https://www.seibuen-amusement-park.jp/event/index.html',
  'verified','published','seibuen-wanwan-halloween-2026',now(),'not_used'
),
(
  'seibuen-parallel-toshimaen-2026','西武園ゆうえんち パラレルワールドとしまえん',
  '2026-09-15','2026-10-25',null,null,true,'continuous',
  '西武園ゆうえんち','埼玉県','所沢市',null,'unknown',false,
  null,'unknown',null,false,'展示・体験内容・入園条件は公式案内を確認','西武園ゆうえんち',
  'https://www.seibuen-amusement-park.jp/',
  array['entertainment','art'],'{}',null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-seibuen'),
  'parallel-toshimaen-2026','https://www.seibuen-amusement-park.jp/',
  'verified','published','seibuen-parallel-toshimaen-2026',now(),'not_used'
),
(
  'chiba-raw-shake-festival-2026','第8回 千葉 生シェイク祭り2026',
  '2026-06-01','2026-10-31',null,null,true,'continuous',
  '千葉県内参加店舗','千葉県','複数',null,'unknown',false,
  '参加店舗・商品により異なる','unknown',null,false,'店舗ごとの提供期間・営業時間・商品情報は公式参加店舗一覧を確認','須藤牧場',
  'https://www.sudo-farm.com/stamp-rally/stamp-book/list-boso?city=1',
  array['food'],'{}',null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-sudo-farm'),
  'raw-shake-festival-2026','https://www.sudo-farm.com/stamp-rally/stamp-book/list-boso?city=1',
  'verified','published','chiba-raw-shake-festival-2026',now(),'not_used'
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

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'official_event','verified','https://www.seibuen-amusement-park.jp/event/index.html',now()
from public.events e
join public.fandom_entities f on f.slug='idolmaster-sidem'
where e.slug='seibuen-sidem-2026'
on conflict(event_id,fandom_id) do update set
  relation_type=excluded.relation_type,
  verification_status='verified',
  source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at,
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
  'seibuen-sidem-2026',
  'seibuen-wanwan-halloween-2026',
  'seibuen-parallel-toshimaen-2026',
  'chiba-raw-shake-festival-2026'
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
set venue_type_keys=array['amusement']
where slug in (
  'seibuen-sidem-2026',
  'seibuen-wanwan-halloween-2026',
  'seibuen-parallel-toshimaen-2026'
);

update public.events
set venue_type_keys=array['other']
where slug='chiba-raw-shake-festival-2026';

commit;
