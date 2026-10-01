-- まちイベ verified production seed batch 3.
-- Rechecked against official organizer/venue pages on 2026-09-23.
-- Factual metadata only. No source prose, logos, or event images are copied.
-- Idempotent: safe to run repeatedly after the v1 foundation migration.

begin;

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,data_url,prefecture,municipality,
  event_use_allowed,terms_review_status,acquisition_mode,automated_fetch_allowed,coverage_scope,coverage_estimate,
  image_policy,fetch_status,last_success_at,notes,is_active,last_reviewed_at
) values
('official-fujiko-museum','川崎市 藤子・F・不二雄ミュージアム','manual','https://fujiko-museum.com/','https://fujiko-museum.com/info/topics/','神奈川県','川崎市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official museum pages used as factual source; no source prose/media copied.',true,now()),
('official-kanagawa-life-museum','神奈川県立生命の星・地球博物館','manual','https://nh.kanagawa-museum.jp/','https://nh.kanagawa-museum.jp/exhibition/temporary/','神奈川県','小田原市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official museum page used as factual source; no source prose/media copied.',true,now()),
('official-yokohama-english-garden','横浜イングリッシュガーデン','manual','https://y-eg.jp/','https://y-eg.jp/information/3905/','神奈川県','横浜市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official garden event page used as factual source; no source prose/media copied.',true,now()),
('official-sankeien','三溪園','manual','https://www.sankeien.or.jp/','https://www.sankeien.or.jp/event/10698/','神奈川県','横浜市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official garden event page used as factual source; no source prose/media copied.',true,now()),
('official-isumi-kankou','いすみ市観光センター','manual','https://isumi-kankou.com/','https://isumi-kankou.com/iseebimaturi/','千葉県','いすみ市',true,'reviewed_facts_only','manual_facts_only',false,'municipality',null,'not_used','healthy',now(),'Official local tourism event page used as factual source; no source prose/media copied.',true,now()),
('official-onjuku-kankou','御宿町観光協会','manual','https://onjuku-kankou.com/','https://onjuku-kankou.com/event/iseebi/','千葉県','御宿町',true,'reviewed_facts_only','manual_facts_only',false,'municipality',null,'not_used','healthy',now(),'Official tourism association event page used as factual source; no source prose/media copied.',true,now())
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
  'fujiko-15th-gadget-2026','藤子・F・不二雄ミュージアム開館15周年記念 ドラえも～ん！願いをかなえるひみつ道具展',
  '2026-07-01','2027-06-20','10:00','18:00',false,'continuous',
  '川崎市 藤子・F・不二雄ミュージアム','214-0023','神奈川県','川崎市','多摩区長尾2丁目8番1号','exact_address',true,
  '大人・大学生1,000円／高校・中学生700円／4歳以上500円／3歳以下無料。障がい者手帳所持者と介助者1名まで無料','partly_free',null,true,'日時指定の事前予約制','川崎市 藤子・F・不二雄ミュージアム',
  'https://fujiko-museum.com/info/topics/',
  array['learning','art','entertainment'],'{}',true,'general',false,
  array['disability_discount','companion_support'],'障がい者手帳所持者は無料。障がい者1名につき介助者1名まで無料。',
  (select id from public.regional_sources where source_key='official-fujiko-museum'),
  '15th-gadget-exhibition-2026','https://fujiko-museum.com/info/topics/',
  'verified','published','fujiko-15th-gadget-2026',now(),'not_used'
),
(
  'kanagawa-life-satoyama-animals-2026','神奈川県立生命の星・地球博物館 特別展「しらべて分かった！里山にくらす動物たち」',
  '2026-07-18','2026-11-08','09:00','16:30',false,'continuous',
  '神奈川県立生命の星・地球博物館 1階 特別展示室','250-0031','神奈川県','小田原市','入生田499','exact_address',true,
  '20歳以上65歳未満720円／15歳以上20歳未満・学生400円／高校生・65歳以上200円／中学生以下無料','partly_free',null,false,null,'神奈川県立生命の星・地球博物館',
  'https://nh.kanagawa-museum.jp/exhibition/temporary/',
  array['learning','nature'],array['family'],true,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-kanagawa-life-museum'),
  'special-satoyama-animals-2026','https://nh.kanagawa-museum.jp/exhibition/temporary/',
  'verified','published','kanagawa-life-satoyama-animals-2026',now(),'not_used'
),
(
  'yokohama-english-garden-halloween-2026','横浜イングリッシュガーデン「ハロウィン・ディスプレイ2026」',
  '2026-09-12','2026-10-31','10:00','18:00',false,'continuous',
  '横浜イングリッシュガーデン','220-0024','神奈川県','横浜市','西区西平沼町6-1 tvk ecom park内','exact_address',true,
  '大人1,200円／小中学生600円／未就学児無料','partly_free',null,false,null,'横浜イングリッシュガーデン',
  'https://y-eg.jp/information/3905/',
  array['family','nature','entertainment'],array['family'],false,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-yokohama-english-garden'),
  'halloween-display-2026','https://y-eg.jp/information/3905/',
  'verified','published','yokohama-english-garden-halloween-2026',now(),'not_used'
),
(
  'sankeien-moon-viewing-2026','横浜・三溪園「観月会」2026',
  '2026-09-25','2026-09-29',null,'20:30',false,'continuous',
  '三溪園 内苑 臨春閣','231-0824','神奈川県','横浜市','中区本牧三之谷58-1','exact_address',true,
  '演奏鑑賞無料（入園料別途）','partly_free',null,false,null,'公益財団法人三溪園保勝会',
  'https://www.sankeien.or.jp/event/10698/',
  array['art','nature','entertainment'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-sankeien'),
  'moon-viewing-10698','https://www.sankeien.or.jp/event/10698/',
  'verified','published','sankeien-moon-viewing-2026',now(),'not_used'
),
(
  'isumi-lobster-festival-2026','2026いすみイセエビまつり',
  '2026-08-09','2026-10-25','08:00','12:30',false,'recurring',
  '大原漁港（港の朝市会場）',null,'千葉県','いすみ市',null,'unknown',false,
  '料金は各販売・企画の公式案内を確認','unknown',null,false,null,'港の朝市協同組合',
  'https://isumi-kankou.com/iseebimaturi/',
  array['food','market'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-isumi-kankou'),
  'iseebi-2026','https://isumi-kankou.com/iseebimaturi/',
  'verified','published','isumi-lobster-festival-2026',now(),'not_used'
),
(
  'onjuku-lobster-festival-2026','おんじゅく伊勢えび祭り2026',
  '2026-09-01','2026-10-31',null,null,true,'continuous',
  '月の沙漠記念館前広場・御宿町内協賛店',null,'千葉県','御宿町',null,'unknown',false,
  '料理・直売・BBQ・各企画の料金は公式案内を確認','unknown',null,false,null,'御宿町観光協会',
  'https://onjuku-kankou.com/event/iseebi/',
  array['food','market'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-onjuku-kankou'),
  'iseebi-2026','https://onjuku-kankou.com/event/iseebi/',
  'verified','published','onjuku-lobster-festival-2026',now(),'not_used'
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

insert into public.event_occurrences(event_id,occurrence_date,start_time,end_time,status,source_note)
select e.id,d::date,'08:00'::time,'12:30'::time,'scheduled','official weekly schedule'
from public.events e
cross join generate_series('2026-08-09'::date,'2026-10-25'::date,'7 days'::interval) d
where e.slug='isumi-lobster-festival-2026'
on conflict do nothing;

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'official_event','verified','https://fujiko-museum.com/info/topics/',now()
from public.events e
join public.fandom_entities f on f.slug='doraemon'
where e.slug='fujiko-15th-gadget-2026'
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
  'fujiko-15th-gadget-2026',
  'kanagawa-life-satoyama-animals-2026',
  'yokohama-english-garden-halloween-2026',
  'sankeien-moon-viewing-2026',
  'isumi-lobster-festival-2026',
  'onjuku-lobster-festival-2026'
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
set venue_type_keys=array['culture_public','event_venue_indoor']
where slug in ('fujiko-15th-gadget-2026','kanagawa-life-satoyama-animals-2026');

update public.events
set venue_type_keys=array['park_plaza','event_venue_outdoor']
where slug in ('yokohama-english-garden-halloween-2026','sankeien-moon-viewing-2026');

update public.events
set venue_type_keys=array['event_venue_outdoor']
where slug='isumi-lobster-festival-2026';

update public.events
set venue_type_keys=array['park_plaza','event_venue_outdoor']
where slug='onjuku-lobster-festival-2026';

commit;
