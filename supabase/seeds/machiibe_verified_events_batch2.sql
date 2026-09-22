-- まちイベ verified production seed batch 2.
-- Verified against official venue/operator pages on 2026-09-22.
-- Factual metadata only. No source prose, logos, or event images are copied.
-- Idempotent: safe to run repeatedly after the v1 foundation migration.

begin;

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,data_url,prefecture,municipality,
  event_use_allowed,terms_review_status,acquisition_mode,automated_fetch_allowed,coverage_scope,coverage_estimate,
  image_policy,fetch_status,last_success_at,notes,is_active,last_reviewed_at
) values
('official-tokyo-solamachi','東京ソラマチ','manual','https://www.tokyo-solamachi.jp/','https://www.tokyo-solamachi.jp/event/list/','東京都','墨田区',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now()),
('official-tokorozawa-sakuratown','ところざわサクラタウン','manual','https://tokorozawa-sakuratown.com/','https://tokorozawa-sakuratown.com/event_all/','埼玉県','所沢市',true,'reviewed_facts_only','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now())
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
  coverage_scope='single_venue',
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
  'solamachi-space-brothers-2026','宇宙兄弟展「完結：」〜ふたつの軌跡〜',
  '2026-09-05','2026-10-04','10:00','20:00',false,'continuous',
  '東京ソラマチ 5F スペース634','131-0045','東京都','墨田区','押上1-1-2','exact_address',true,
  '入場料1,969円（税込）','paid',false,null,'最終日は17:00終了（最終入場16:30）',null,
  'https://www.tokyo-solamachi.jp/autumn/event/',
  array['learning','entertainment','art'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokyo-solamachi'),
  'space-brothers-conclusion-2026','https://www.tokyo-solamachi.jp/autumn/event/',
  'verified','published','solamachi-space-brothers-2026',now(),'not_used'
),
(
  'joypolis-halloween-2026','Happy Halloween JOYPOLIS 2026',
  '2026-09-19','2026-10-31',null,null,true,'continuous',
  '東京ジョイポリス','135-0091','東京都','港区','台場1丁目6番1号 DECKS Tokyo Beach 3F～5F','exact_address',true,
  '東京ジョイポリスの入場料・パスポート等が必要。企画により別料金あり','paid',false,null,null,'東京ジョイポリス',
  'https://tokyo-joypolis.com/event/Halloween2026/index.html',
  array['entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-joypolis'),
  'Halloween2026','https://tokyo-joypolis.com/event/Halloween2026/index.html',
  'verified','published','joypolis-halloween-2026',now(),'not_used'
),
(
  'joypolis-hololive-shiny-party','ホロライブ × ジョイポリス SHINY PARTY',
  '2026-10-16','2026-12-27',null,null,true,'continuous',
  '東京ジョイポリス','135-0091','東京都','港区','台場1丁目6番1号 DECKS Tokyo Beach 3F～5F','exact_address',true,
  '東京ジョイポリス入場料等が必要。ホロ×マッチ参加券は各回8,500円','paid',false,null,null,'東京ジョイポリス',
  'https://tokyo-joypolis.com/event/hololive_jp2026/index.html',
  array['entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-joypolis'),
  'hololive_jp2026','https://tokyo-joypolis.com/event/hololive_jp2026/index.html',
  'verified','published','joypolis-hololive-shiny-party',now(),'not_used'
),
(
  'joypolis-bloom-world','堂本光一 × ふぉ～ゆ～ BLOOM WORLD in JOYPOLIS',
  '2026-07-09','2026-10-04',null,null,true,'continuous',
  '東京ジョイポリス','135-0091','東京都','港区','台場1丁目6番1号 DECKS Tokyo Beach 3F～5F','exact_address',true,
  '東京ジョイポリスの入場料・パスポート等が必要','paid',false,null,null,'東京ジョイポリス',
  'https://tokyo-joypolis.com/event/kd_4u_jp/index.html',
  array['entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-joypolis'),
  'kd_4u_jp','https://tokyo-joypolis.com/event/kd_4u_jp/index.html',
  'verified','published','joypolis-bloom-world',now(),'not_used'
),
(
  'tdc-space-travel-tour-2026','Space Travelium TeNQ 特別企画「体験型謎解き 宇宙トラベルツアー」',
  '2026-10-22','2027-02-07',null,null,true,'continuous',
  'Space Travelium TeNQ 企画展示エリア','112-8575','東京都','文京区','後楽1-3-61','exact_address',true,
  '施設の入館料に含む','paid',false,null,null,'Space Travelium TeNQ',
  'https://www.tokyo-dome.co.jp/tenq/event/exhibition-stt-8.html',
  array['learning','entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokyo-dome-city'),
  'exhibition-stt-8','https://www.tokyo-dome.co.jp/tenq/event/exhibition-stt-8.html',
  'verified','published','tdc-space-travel-tour-2026',now(),'not_used'
),
(
  'tdc-drstone-tenq-2026','TVアニメ「Dr.STONE」×Space Travelium TeNQ 企画展『ROAD TO THE MOON』',
  '2026-07-18','2026-10-18',null,null,true,'continuous',
  'Space Travelium TeNQ 企画展示エリア','112-8575','東京都','文京区','後楽1-3-61','exact_address',true,
  '施設の入館料に含む','paid',false,null,null,'Space Travelium TeNQ',
  'https://www.tokyo-dome.co.jp/tenq/event/exhibition-stt-7.html',
  array['learning','entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokyo-dome-city'),
  'exhibition-stt-7','https://www.tokyo-dome.co.jp/tenq/event/exhibition-stt-7.html',
  'verified','published','tdc-drstone-tenq-2026',now(),'not_used'
),
(
  'lalaport-pokemon-height-2026','さがして、はかって！ポケモンたかさ調査隊！',
  '2026-09-18','2026-09-27','10:00','17:00',false,'continuous',
  'ららぽーとTOKYO-BAY 南館1F 南Bエスカレーター下 受付','273-8530','千葉県','船橋市','浜町2-1-1','exact_address',true,
  '参加無料','free',true,false,'各日先着1,000名・受付終了16:30',null,
  'https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3610874.html',
  array['family','learning','entertainment'],array['preschool','elementary','family'],true,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-lalaport-tokyobay'),
  '3610874','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3610874.html',
  'verified','published','lalaport-pokemon-height-2026',now(),'not_used'
),
(
  'lalaterrace-sanrio-wagon-2026','サンリオカフェワゴンがやってくる♪',
  '2026-09-26','2026-09-27','10:00','18:00',false,'continuous',
  'ららテラスTOKYO-BAY エントランス周辺',null,'千葉県','船橋市',null,'unknown',false,
  '商品購入は有料。イベント自体の入場料金記載なし','unknown',null,false,null,null,
  'https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3637322.html',
  array['family','food','entertainment'],array['family'],null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-lalaport-tokyobay'),
  '3637322','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3637322.html',
  'verified','published','lalaterrace-sanrio-wagon-2026',now(),'not_used'
),
(
  'lalaport-shinako-20260923','しなこちゃんイベント',
  '2026-09-23','2026-09-23','13:00',null,false,'single',
  'ららぽーとTOKYO-BAY North Gate 1F みどりの広場','273-8530','千葉県','船橋市','浜町2-1-1','exact_address',true,
  '参加条件あり。GiGO対象プリ機での撮影と抽選が必要','unknown',null,true,'抽選当選者のみ参加（130組、1組2名まで）',null,
  'https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3611265.html',
  array['family','entertainment'],array['family'],null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-lalaport-tokyobay'),
  '3611265','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3611265.html',
  'verified','published','lalaport-shinako-20260923',now(),'not_used'
),
(
  'sakuratown-kozame-2026','おでかけ子ザメ おいSEA たのSEA サクラタウンさんぽ',
  '2026-09-18','2026-11-08',null,null,true,'continuous',
  'ところざわサクラタウン（角川武蔵野ミュージアム、KadoCafeほか）',null,'埼玉県','所沢市',null,'unknown',false,
  '一部有料','partly_free',null,null,null,'ところざわサクラタウン',
  'https://tokorozawa-sakuratown.com/event_calendar/odekake-kozame.html',
  array['family','entertainment'],array['preschool','elementary','family'],null,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokorozawa-sakuratown'),
  'odekake-kozame','https://tokorozawa-sakuratown.com/event_calendar/odekake-kozame.html',
  'verified','published','sakuratown-kozame-2026',now(),'not_used'
),
(
  'sakuratown-galaxy999-2026','『銀河鉄道999』50周年プロジェクト 松本零士展 創作の旅路',
  '2026-09-19','2026-10-26','10:00','18:00',false,'continuous',
  '角川武蔵野ミュージアム 3階 展示室',null,'埼玉県','所沢市',null,'unknown',false,
  '一般2,400円／中高生1,700円／小学生1,100円','paid',false,null,'最終入場17:30','角川メディアハウス',
  'https://tokorozawa-sakuratown.com/event_calendar/999-50thproject.html',
  array['art','entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokorozawa-sakuratown'),
  '999-50thproject','https://tokorozawa-sakuratown.com/event_calendar/999-50thproject.html',
  'verified','published','sakuratown-galaxy999-2026',now(),'not_used'
),
(
  'sakuratown-essay-manga-2026','わたしをすくう エッセイマンガの処方箋展',
  '2026-09-18','2027-01-11','10:00','18:00',false,'continuous',
  '角川武蔵野ミュージアム 4階 エディットアンドアートギャラリー',null,'埼玉県','所沢市',null,'unknown',false,
  '一般1,400円／中高生1,200円／小学生1,000円／未就学児無料','partly_free',null,null,'最終入館17:30','角川武蔵野ミュージアム',
  'https://tokorozawa-sakuratown.com/event_categories/essay-manga.html',
  array['art','learning'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokorozawa-sakuratown'),
  'essay-manga','https://tokorozawa-sakuratown.com/event_categories/essay-manga.html',
  'verified','published','sakuratown-essay-manga-2026',now(),'not_used'
),
(
  'ariake-thanks-mama-mini-2026','Thanksママフォーラムmini',
  '2026-09-22','2026-09-23','10:00','16:00',false,'continuous',
  '有明ガーデン モール内',null,'東京都','江東区','有明2-1-8','exact_address',true,
  '参加無料（一部有料コンテンツあり）','partly_free',null,null,'一部事前WEB予約制','住友不動産商業マネジメント株式会社',
  'https://prtimes.jp/main/html/rd/p/000000497.000062100.html',
  array['family','learning'],array['age_0_2','preschool','family'],true,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-ariake-garden'),
  'thanks-mama-mini-20260922','https://prtimes.jp/main/html/rd/p/000000497.000062100.html',
  'verified','published','ariake-thanks-mama-mini-2026',now(),'not_used'
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

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'official_event','verified',v.source_url,now()
from (values
  ('solamachi-space-brothers-2026','space-brothers','https://www.tokyo-solamachi.jp/autumn/event/'),
  ('joypolis-hololive-shiny-party','hololive','https://tokyo-joypolis.com/event/hololive_jp2026/index.html'),
  ('tdc-drstone-tenq-2026','dr-stone','https://www.tokyo-dome.co.jp/tenq/event/exhibition-stt-7.html'),
  ('lalaport-pokemon-height-2026','pokemon','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3610874.html'),
  ('lalaterrace-sanrio-wagon-2026','sanrio','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3637322.html'),
  ('lalaport-shinako-20260923','shinako','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3611265.html'),
  ('sakuratown-kozame-2026','odekake-kozame','https://tokorozawa-sakuratown.com/event_calendar/odekake-kozame.html'),
  ('sakuratown-galaxy999-2026','galaxy-express-999','https://tokorozawa-sakuratown.com/event_calendar/999-50thproject.html')
) v(event_slug,fandom_slug,source_url)
join public.events e on e.slug=v.event_slug
join public.fandom_entities f on f.slug=v.fandom_slug
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
  'solamachi-space-brothers-2026','joypolis-halloween-2026','joypolis-hololive-shiny-party',
  'joypolis-bloom-world','tdc-space-travel-tour-2026','tdc-drstone-tenq-2026',
  'lalaport-pokemon-height-2026','lalaterrace-sanrio-wagon-2026','lalaport-shinako-20260923',
  'sakuratown-kozame-2026','sakuratown-galaxy999-2026','sakuratown-essay-manga-2026',
  'ariake-thanks-mama-mini-2026'
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

commit;
