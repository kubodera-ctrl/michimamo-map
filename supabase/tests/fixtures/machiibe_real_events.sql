-- CI-only real-event fixture for Machi Ibe v1 validation.
-- Verified against official pages on 2026-09-20.
-- IMPORTANT: factual metadata only. No copyrighted source prose or images are copied.
-- This file is loaded only inside an ephemeral PostgreSQL transaction in CI and is never a production migration.

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,data_url,license_text,prefecture,municipality,
  event_use_allowed,terms_review_status,acquisition_mode,automated_fetch_allowed,
  image_policy,fetch_status,last_success_at,notes,is_active,last_reviewed_at
) values
(
  'preview-mizunokagaku','東京都水の科学館','manual',
  'https://www.mizunokagaku.jp/','https://www.mizunokagaku.jp/event/',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-miraikan','日本科学未来館','manual',
  'https://www.miraikan.jst.go.jp/','https://www.miraikan.jst.go.jp/events/',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-city-circuit','CITY CIRCUIT TOKYO BAY','manual',
  'https://city-circuit.com/','https://city-circuit.com/news/',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-littleplanet','リトルプラネット','manual',
  'https://litpla.com/','https://litpla.com/news/',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-ariake-garden','有明ガーデン','manual',
  'https://ariake.shopping-sumitomo-rd.com/','https://ariake.shopping-sumitomo-rd.com/event/',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-joypolis','東京ジョイポリス','manual',
  'https://tokyo-joypolis.com/','https://tokyo-joypolis.com/event/',
  'CI-only factual metadata; no source prose or media copied.','東京都','港区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-toyosu-senkyaku','豊洲 千客万来','manual',
  'https://www.toyosu-senkyakubanrai.jp/','https://www.toyosu-senkyakubanrai.jp/event_news',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
),
(
  'preview-dainankyoku','特別展「大南極展」公式サイト','manual',
  'https://dainankyokuten.jp/','https://dainankyokuten.jp/',
  'CI-only factual metadata; no source prose or media copied.','東京都','江東区',
  true,'reviewed_facts_only','manual_facts_only',false,'not_used','healthy',now(),
  'Ephemeral CI fixture only. event_use_allowed=true solely to exercise public RPC behavior.',true,now()
);

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
  'preview-real-water-balloon-20260920','みなみちゃんのハッピーバルーンショー！',
  '2026-09-20','2026-09-20',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260920_minami_happybaloonshow/',
  array['family','entertainment'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-mizunokagaku'),
  '260920_minami_happybaloonshow','https://www.mizunokagaku.jp/event/260920_minami_happybaloonshow/',
  'verified','published','preview-real-water-balloon-20260920',now(),'not_used'
),
(
  'preview-real-water-kendama-20260921','けん玉ショー＆ワークショップ',
  '2026-09-21','2026-09-21',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260921_kendama_show/',
  array['family','learning'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-mizunokagaku'),
  '260921_kendama_show','https://www.mizunokagaku.jp/event/260921_kendama_show/',
  'verified','published','preview-real-water-kendama-20260921',now(),'not_used'
),
(
  'preview-real-water-clown-rio-20260922','クラウン・リオのパフォーマンスショー',
  '2026-09-22','2026-09-22',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260922_clown_rio_show/',
  array['family','entertainment'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-mizunokagaku'),
  '260922_clown_rio_show','https://www.mizunokagaku.jp/event/260922_clown_rio_show/',
  'verified','published','preview-real-water-clown-rio-20260922',now(),'not_used'
),
(
  'preview-real-water-seoppi-20260923','SEOPPIのスポーツスタッキングショー',
  '2026-09-23','2026-09-23',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260923_seoppi_show/',
  array['family','sports'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-mizunokagaku'),
  '260923_seoppi_show','https://www.mizunokagaku.jp/event/260923_seoppi_show/',
  'verified','published','preview-real-water-seoppi-20260923',now(),'not_used'
),
(
  'preview-real-miraikan-moon-2026','中秋の名月 未来館でお月見！2026',
  '2026-09-18','2026-09-27',null,null,false,'recurring',
  '日本科学未来館','135-0064','東京都','江東区','青海2-3-6','exact_address',true,
  '参加費は入館料のみ','paid',false,null,null,'日本科学未来館',
  'https://www.miraikan.jst.go.jp/events/202609184720.html',
  array['learning','nature'],'{}',true,'general',true,
  array['captions'],'字幕が必要な場合は事前相談。手話通訳は9月22日の13:35プログラムのみ。',
  (select id from public.regional_sources where source_key='preview-miraikan'),
  '202609184720','https://www.miraikan.jst.go.jp/events/202609184720.html',
  'verified','published','preview-real-miraikan-moon-2026',now(),'not_used'
),
(
  'preview-real-city-circuit-ev-20260923','AUTOBACS 全日本カート選手権 EV部門 第5戦・第6戦／キッズEVカート無料走行体験',
  '2026-09-23','2026-09-23','10:00','18:50',false,'single',
  'CITY CIRCUIT TOKYO BAY','135-0064','東京都','江東区','青海1丁目3-12','exact_address',true,
  'レース観戦とキッズEVカートは無料。電動バイク体験は1,000円','partly_free',null,false,'キッズEVカートは事前予約なし','CITY CIRCUIT TOKYO BAY',
  'https://city-circuit.com/2026/09/alljapankartingchampionship_ev_263/',
  array['family','sports'],array['family'],null,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-city-circuit'),
  'alljapankartingchampionship_ev_263','https://city-circuit.com/2026/09/alljapankartingchampionship_ev_263/',
  'verified','published','preview-real-city-circuit-ev-20260923',now(),'not_used'
),
(
  'preview-real-littleplanet-halloween-2026','リトルプラネット ハロウィン2026',
  '2026-09-17','2026-11-01',null,null,true,'continuous',
  'リトルプラネット ダイバーシティ東京プラザ',null,'東京都','江東区',null,'unknown',false,
  'パーク入場料が必要（料金は公式サイト参照）','paid',false,null,null,'リトルプラネット',
  'https://www.litpla.com/news/press/halloween2026-info/',
  array['family','entertainment'],array['family'],true,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-littleplanet'),
  'halloween2026-info','https://www.litpla.com/news/press/halloween2026-info/',
  'verified','published','preview-real-littleplanet-halloween-2026',now(),'not_used'
),
(
  'preview-real-ariake-quizknock-nazotoki-2026','有明ガーデン周遊謎解き「神の使いと叶えられない願い事」',
  '2026-08-29','2026-10-04','10:00','21:00',false,'continuous',
  '有明ガーデン各所',null,'東京都','江東区',null,'unknown',false,
  '販売価格2,500円（税込）','paid',false,null,null,'有明ガーデン',
  'https://ariake.shopping-sumitomo-rd.com/event/3843/',
  array['learning','entertainment'],'{}',null,'general',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-ariake-garden'),
  '3843','https://ariake.shopping-sumitomo-rd.com/event/3843/',
  'verified','published','preview-real-ariake-quizknock-nazotoki-2026',now(),'not_used'
),
(
  'preview-real-joypolis-sidem-3-2026','アイドルマスター SideM in JOYPOLIS 3',
  '2026-09-12','2026-12-06',null,null,true,'continuous',
  '東京ジョイポリス','135-0091','東京都','港区','台場1丁目6番1号 DECKS Tokyo Beach 3F～5F','exact_address',true,
  'スペシャルショーは無料。東京ジョイポリス入場料が必要で、ほか有料コンテンツあり','partly_free',null,null,null,'東京ジョイポリス',
  'https://tokyo-joypolis.com/event/sidem_jp2026/index.html',
  array['entertainment'],'{}',true,'general',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-joypolis'),
  'sidem_jp2026','https://tokyo-joypolis.com/event/sidem_jp2026/index.html',
  'verified','published','preview-real-joypolis-sidem-3-2026',now(),'not_used'
),
(
  'preview-real-toyosu-kamimaro-202609','紙磨呂（かみまろ）マジックショー',
  '2026-09-23','2026-09-30',null,null,false,'irregular',
  '豊洲 千客万来 二階 時の鐘広場',null,'東京都','江東区',null,'unknown',false,
  '観覧無料','free',true,null,null,'豊洲 千客万来',
  'https://www.toyosu-senkyakubanrai.jp/eventnews/0729',
  array['entertainment'],array['family'],null,'general',true,
  '{}',null,
  (select id from public.regional_sources where source_key='preview-toyosu-senkyaku'),
  '0729','https://www.toyosu-senkyakubanrai.jp/eventnews/0729',
  'verified','published','preview-real-toyosu-kamimaro-202609',now(),'not_used'
),
(
  'preview-real-dainankyoku-2026','特別展「大南極展」',
  '2026-07-01','2026-09-27',null,null,true,'continuous',
  '日本科学未来館','135-0064','東京都','江東区','青海2-3-6','exact_address',true,
  '大人2,000円／18歳以下1,300円／3歳以上未就学児900円。2歳以下無料','paid',false,null,null,null,
  'https://dainankyokuten.jp/',
  array['learning','nature'],'{}',true,'general',true,
  array['disability_discount','companion_support'],'障害者手帳・受給者証等の証明書所持者は本人と付添1名まで無料。',
  (select id from public.regional_sources where source_key='preview-dainankyoku'),
  'dainankyoku-2026','https://dainankyokuten.jp/',
  'verified','published','preview-real-dainankyoku-2026',now(),'not_used'
);

-- Exact sessions for multi-session and irregular events.
insert into public.event_occurrences(event_id,occurrence_date,start_time,status,source_note)
select e.id,v.d,v.t,'scheduled','official schedule'
from public.events e
join (
  values
    ('preview-real-water-balloon-20260920','2026-09-20'::date,'11:00'::time),
    ('preview-real-water-balloon-20260920','2026-09-20'::date,'13:30'::time),
    ('preview-real-water-kendama-20260921','2026-09-21'::date,'11:00'::time),
    ('preview-real-water-kendama-20260921','2026-09-21'::date,'13:30'::time),
    ('preview-real-water-clown-rio-20260922','2026-09-22'::date,'11:00'::time),
    ('preview-real-water-clown-rio-20260922','2026-09-22'::date,'13:30'::time),
    ('preview-real-water-seoppi-20260923','2026-09-23'::date,'11:00'::time),
    ('preview-real-water-seoppi-20260923','2026-09-23'::date,'13:30'::time)
) v(slug,d,t) on e.slug=v.slug;

insert into public.event_occurrences(event_id,occurrence_date,start_time,end_time,status,source_note)
select e.id,d::date,t1::time,t2::time,'scheduled','official daily program'
from public.events e
cross join (
  values
    ('2026-09-18','13:35','13:40'),('2026-09-18','15:00','15:15'),
    ('2026-09-19','13:35','13:40'),('2026-09-19','15:00','15:15'),
    ('2026-09-20','13:35','13:40'),('2026-09-20','15:00','15:15'),
    ('2026-09-21','13:35','13:40'),('2026-09-21','15:00','15:15'),
    ('2026-09-22','13:35','13:40'),('2026-09-22','15:00','15:15'),
    ('2026-09-23','13:35','13:40'),('2026-09-23','15:00','15:15'),
    ('2026-09-24','13:35','13:40'),('2026-09-24','15:00','15:15'),
    ('2026-09-25','13:35','13:40'),('2026-09-25','15:00','15:15'),
    ('2026-09-26','13:35','13:40'),('2026-09-26','15:00','15:15'),
    ('2026-09-27','13:35','13:40'),('2026-09-27','15:00','15:15')
) v(d,t1,t2)
where e.slug='preview-real-miraikan-moon-2026';

insert into public.event_occurrences(event_id,occurrence_date,start_time,status,source_note)
select e.id,v.d,v.t,'scheduled','official schedule'
from public.events e
join (
  values
    ('2026-09-23'::date,'12:00'::time),('2026-09-23'::date,'14:00'::time),('2026-09-23'::date,'16:00'::time),
    ('2026-09-30'::date,'12:00'::time),('2026-09-30'::date,'14:00'::time),('2026-09-30'::date,'16:00'::time)
) v(d,t) on e.slug='preview-real-toyosu-kamimaro-202609';

-- Verified fandom relationships from official collaboration pages.
insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'venue_collaboration','verified','https://ariake.shopping-sumitomo-rd.com/event/3843/',now()
from public.events e
join public.fandom_entities f on f.slug='quizknock'
where e.slug='preview-real-ariake-quizknock-nazotoki-2026';

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'licensed_collaboration','verified','https://tokyo-joypolis.com/event/sidem_jp2026/index.html',now()
from public.events e
join public.fandom_entities f on f.slug='idolmaster-sidem'
where e.slug='preview-real-joypolis-sidem-3-2026';

-- Feed the same records through the admin "newly detected" surface.
insert into public.event_source_records(
  source_id,source_event_key,event_id,source_title,source_start_date,source_end_date,
  source_venue_name,source_url,normalization_status,fetched_at,source_updated_at
)
select
  e.source_id,e.source_event_key,e.id,e.title,e.start_date,e.end_date,
  e.venue_name,e.source_page_url,'normalized',now(),e.source_updated_at
from public.events e
where e.slug like 'preview-real-%';
