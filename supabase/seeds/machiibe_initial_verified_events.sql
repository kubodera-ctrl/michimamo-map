-- まちイベ v1 initial verified production seed.
-- Verified against official pages on 2026-09-21 and 2026-09-22.
-- Factual metadata only. No source prose, logos, or event images are copied.
-- Idempotent: safe to run again without duplicating canonical events or occurrences.

begin;

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,data_url,prefecture,municipality,
  event_use_allowed,terms_review_status,acquisition_mode,automated_fetch_allowed,coverage_scope,coverage_estimate,
  image_policy,fetch_status,last_success_at,notes,is_active,last_reviewed_at
) values
('official-mizunokagaku','東京都水の科学館','manual','https://www.mizunokagaku.jp/','https://www.mizunokagaku.jp/event/','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-miraikan','日本科学未来館','manual','https://www.miraikan.jst.go.jp/','https://www.miraikan.jst.go.jp/events/','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-city-circuit','CITY CIRCUIT TOKYO BAY','manual','https://city-circuit.com/','https://city-circuit.com/news/','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-littleplanet','リトルプラネット','manual','https://litpla.com/','https://litpla.com/news/','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-ariake-garden','有明ガーデン','manual','https://ariake.shopping-sumitomo-rd.com/','https://ariake.shopping-sumitomo-rd.com/event/','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-joypolis','東京ジョイポリス','manual','https://tokyo-joypolis.com/','https://tokyo-joypolis.com/event/','東京都','港区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-toyosu-senkyaku','豊洲 千客万来','manual','https://www.toyosu-senkyakubanrai.jp/','https://www.toyosu-senkyakubanrai.jp/event_news','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-dainankyoku','特別展「大南極展」公式サイト','manual','https://dainankyokuten.jp/','https://dainankyokuten.jp/','東京都','江東区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official page used as factual source; no source prose/media copied.',true,now()),
('official-sunshine-city','サンシャインシティ','manual','https://sunshinecity.jp/','https://sunshinecity.jp/event/','東京都','豊島区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now()),
('official-tokyo-dome-city','東京ドームシティ','manual','https://www.tokyo-dome.co.jp/','https://www.tokyo-dome.co.jp/event/','東京都','文京区',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now()),
('official-lalaport-tokyobay','ららぽーとTOKYO-BAY','manual','https://mitsui-shopping-park.com/lalaport/tokyo-bay/','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/','千葉県','船橋市',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now()),
('official-kamogawa-seaworld','鴨川シーワールド','manual','https://www.kamogawa-seaworld.jp/','https://www.kamogawa-seaworld.jp/event/','千葉県','鴨川市',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now()),
('official-metsa','ムーミンバレーパーク・メッツァビレッジ','manual','https://metsa-hanno.com/','https://metsa-hanno.com/event/','埼玉県','飯能市',true,'reviewed_allowed','manual_facts_only',false,'single_venue',null,'not_used','healthy',now(),'Official event page used as factual source; no source prose/media copied.',true,now())
on conflict(source_key) do update set
  name=excluded.name,
  homepage_url=excluded.homepage_url,
  data_url=excluded.data_url,
  prefecture=excluded.prefecture,
  municipality=excluded.municipality,
  event_use_allowed=excluded.event_use_allowed,
  terms_review_status=excluded.terms_review_status,
  acquisition_mode=excluded.acquisition_mode,
  automated_fetch_allowed=excluded.automated_fetch_allowed,
  coverage_scope=excluded.coverage_scope,
  coverage_estimate=excluded.coverage_estimate,
  image_policy=excluded.image_policy,
  fetch_status=excluded.fetch_status,
  last_success_at=excluded.last_success_at,
  notes=excluded.notes,
  is_active=true,
  last_reviewed_at=excluded.last_reviewed_at,
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
  'water-kendama-20260921','けん玉ショー＆ワークショップ',
  '2026-09-21','2026-09-21',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260921_kendama_show/',
  array['family','learning'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-mizunokagaku'),
  '260921_kendama_show','https://www.mizunokagaku.jp/event/260921_kendama_show/',
  'verified','published','water-kendama-20260921',now(),'not_used'
),
(
  'water-clown-rio-20260922','クラウン・リオのパフォーマンスショー',
  '2026-09-22','2026-09-22',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260922_clown_rio_show/',
  array['family','entertainment'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-mizunokagaku'),
  '260922_clown_rio_show','https://www.mizunokagaku.jp/event/260922_clown_rio_show/',
  'verified','published','water-clown-rio-20260922',now(),'not_used'
),
(
  'water-seoppi-20260923','SEOPPIのスポーツスタッキングショー',
  '2026-09-23','2026-09-23',null,null,false,'irregular',
  '東京都水の科学館 1F オリエンテーションルーム','135-0063','東京都','江東区','有明3-1-8','exact_address',true,
  '入館・館内体験は無料','free',true,false,'各回1時間前から整理券配布・予約不可','東京都水の科学館',
  'https://www.mizunokagaku.jp/event/260923_seoppi_show/',
  array['family','sports'],array['preschool','elementary','family'],true,'child_centered',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-mizunokagaku'),
  '260923_seoppi_show','https://www.mizunokagaku.jp/event/260923_seoppi_show/',
  'verified','published','water-seoppi-20260923',now(),'not_used'
),
(
  'miraikan-moon-2026','中秋の名月 未来館でお月見！2026',
  '2026-09-18','2026-09-27',null,null,false,'recurring',
  '日本科学未来館','135-0064','東京都','江東区','青海2-3-6','exact_address',true,
  '参加費は入館料のみ','paid',false,null,null,'日本科学未来館',
  'https://www.miraikan.jst.go.jp/events/202609184720.html',
  array['learning','nature'],'{}',true,'general',true,
  array['captions'],'字幕が必要な場合は事前相談。手話通訳は9月22日の13:35プログラムのみ。',
  (select id from public.regional_sources where source_key='official-miraikan'),
  '202609184720','https://www.miraikan.jst.go.jp/events/202609184720.html',
  'verified','published','miraikan-moon-2026',now(),'not_used'
),
(
  'city-circuit-kart-ev-20260923','AUTOBACS 全日本カート選手権 EV部門 第5戦・第6戦／キッズEVカート無料走行体験',
  '2026-09-23','2026-09-23','10:00','18:50',false,'single',
  'CITY CIRCUIT TOKYO BAY','135-0064','東京都','江東区','青海1丁目3-12','exact_address',true,
  'レース観戦とキッズEVカートは無料。電動バイク体験は1,000円','partly_free',null,false,'キッズEVカートは事前予約なし','CITY CIRCUIT TOKYO BAY',
  'https://city-circuit.com/2026/09/alljapankartingchampionship_ev_263/',
  array['family','sports'],array['family'],null,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-city-circuit'),
  'alljapankartingchampionship_ev_263','https://city-circuit.com/2026/09/alljapankartingchampionship_ev_263/',
  'verified','published','city-circuit-kart-ev-20260923',now(),'not_used'
),
(
  'littleplanet-halloween-divercity-2026','リトルプラネット ハロウィン2026',
  '2026-09-17','2026-11-01',null,null,true,'continuous',
  'リトルプラネット ダイバーシティ東京プラザ',null,'東京都','江東区',null,'unknown',false,
  'パーク入場料が必要（料金は公式サイト参照）','paid',false,null,null,'リトルプラネット',
  'https://www.litpla.com/news/press/halloween2026-info/',
  array['family','entertainment'],array['family'],true,'family_friendly',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-littleplanet'),
  'halloween2026-info-divercity','https://www.litpla.com/news/press/halloween2026-info/',
  'verified','published','littleplanet-halloween-divercity-2026',now(),'not_used'
),
(
  'ariake-quizknock-nazotoki-2026','有明ガーデン周遊謎解き「神の使いと叶えられない願い事」',
  '2026-08-29','2026-10-04','10:00','21:00',false,'continuous',
  '有明ガーデン各所',null,'東京都','江東区',null,'unknown',false,
  '販売価格2,500円（税込）','paid',false,null,null,'有明ガーデン',
  'https://ariake.shopping-sumitomo-rd.com/event/3843/',
  array['learning','entertainment'],'{}',null,'general',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-ariake-garden'),
  '3843','https://ariake.shopping-sumitomo-rd.com/event/3843/',
  'verified','published','ariake-quizknock-nazotoki-2026',now(),'not_used'
),
(
  'joypolis-sidem-3-2026','アイドルマスター SideM in JOYPOLIS 3',
  '2026-09-12','2026-12-06',null,null,true,'continuous',
  '東京ジョイポリス','135-0091','東京都','港区','台場1丁目6番1号 DECKS Tokyo Beach 3F～5F','exact_address',true,
  'スペシャルショーは無料。東京ジョイポリス入場料が必要で、ほか有料コンテンツあり','partly_free',null,null,null,'東京ジョイポリス',
  'https://tokyo-joypolis.com/event/sidem_jp2026/index.html',
  array['entertainment'],'{}',true,'general',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-joypolis'),
  'sidem_jp2026','https://tokyo-joypolis.com/event/sidem_jp2026/index.html',
  'verified','published','joypolis-sidem-3-2026',now(),'not_used'
),
(
  'toyosu-kamimaro-202609','紙磨呂（かみまろ）マジックショー',
  '2026-09-23','2026-09-30',null,null,false,'irregular',
  '豊洲 千客万来 二階 時の鐘広場',null,'東京都','江東区',null,'unknown',false,
  '観覧無料','free',true,null,null,'豊洲 千客万来',
  'https://www.toyosu-senkyakubanrai.jp/eventnews/0729',
  array['entertainment'],array['family'],null,'general',true,
  '{}',null,
  (select id from public.regional_sources where source_key='official-toyosu-senkyaku'),
  '0729','https://www.toyosu-senkyakubanrai.jp/eventnews/0729',
  'verified','published','toyosu-kamimaro-202609',now(),'not_used'
),
(
  'dainankyoku-2026','特別展「大南極展」',
  '2026-07-01','2026-09-27','10:00','17:00',false,'continuous',
  '日本科学未来館 1階 企画展示ゾーン','135-0064','東京都','江東区','青海2-3-6','exact_address',true,
  '大人2,000円／18歳以下1,300円／3歳以上未就学児900円。2歳以下無料','paid',false,null,null,null,
  'https://dainankyokuten.jp/',
  array['learning','nature'],'{}',true,'general',true,
  array['disability_discount','companion_support'],'障害者手帳・受給者証等の証明書所持者は本人と付添1名まで無料。',
  (select id from public.regional_sources where source_key='official-dainankyoku'),
  'dainankyoku-2026','https://dainankyokuten.jp/',
  'verified','published','dainankyoku-2026',now(),'not_used'
),
(
  'sunshine-gashapon-tours-2026','ガシャっと回してポーンツアーズ2026',
  '2026-10-09','2026-10-11',null,null,false,'continuous',
  'サンシャインシティ 展示ホールB',null,'東京都','豊島区',null,'unknown',false,
  '入場無料','free',true,null,null,'株式会社バンダイ',
  'https://sunshinecity.jp/event/entry-38626.html',
  array['entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-sunshine-city'),
  'entry-38626','https://sunshinecity.jp/event/entry-38626.html',
  'verified','published','sunshine-gashapon-tours-2026',now(),'not_used'
),
(
  'tdc-hybrid-training-2026','Hybrid Training in Tokyo Dome City',
  '2026-10-19','2026-10-22',null,null,false,'irregular',
  '東京ドームシティ アトラクションズ バイキング芝生広場・スプラッシュガーデン','112-8575','東京都','文京区','後楽1-3-61','exact_address',true,
  'チケット販売予定。料金は公式情報を確認','unknown',null,null,null,'株式会社東京ドーム',
  'https://www.tokyo-dome.co.jp/event/city/hybrid_training2026.html',
  array['sports'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokyo-dome-city'),
  'hybrid_training2026','https://www.tokyo-dome.co.jp/event/city/hybrid_training2026.html',
  'verified','published','tdc-hybrid-training-2026',now(),'not_used'
),
(
  'tdc-toukenranbu-return-2026','ミュージカル『刀剣乱舞』 ～月夜一縷～ × 東京ドームシティ（東京凱旋公演期間）',
  '2026-10-17','2026-10-25',null,null,true,'continuous',
  '東京ドームシティ','112-8575','東京都','文京区','後楽1-3-61','exact_address',true,
  'コラボフード・ドリンク等は有料。詳細は公式情報を確認','unknown',null,null,null,null,
  'https://www.tokyo-dome.co.jp/event/city/musical-toukenranbu_autumn2026.html',
  array['entertainment','food'],'{}',null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-tokyo-dome-city'),
  'musical-toukenranbu-autumn2026-return','https://www.tokyo-dome.co.jp/event/city/musical-toukenranbu_autumn2026.html',
  'verified','published','tdc-toukenranbu-return-2026',now(),'not_used'
),
(
  'lalaport-jujutsu-5th-2026','アニメ『呪術廻戦』5周年記念！ららぽーと・ラゾーナコラボキャンペーン',
  '2026-09-29','2026-10-14',null,null,true,'continuous',
  'ららぽーとTOKYO-BAY',null,'千葉県','船橋市',null,'unknown',false,
  '館内企画と購入条件付き特典あり。詳細は公式情報を確認','unknown',null,null,null,null,
  'https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3612314.html',
  array['entertainment'],'{}',true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-lalaport-tokyobay'),
  '3612314','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3612314.html',
  'verified','published','lalaport-jujutsu-5th-2026',now(),'not_used'
),
(
  'kamogawa-beluga-50th-2026','ベルーガ50th Anniversary',
  '2026-09-01','2027-06-30',null,null,true,'continuous',
  '鴨川シーワールド',null,'千葉県','鴨川市',null,'unknown',false,
  '入館料金等は公式料金案内を確認','unknown',null,null,null,'鴨川シーワールド',
  'https://www.kamogawa-seaworld.jp/event/event_info/15821/',
  array['nature','entertainment'],'{}',null,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-kamogawa-seaworld'),
  'event-info-15821','https://www.kamogawa-seaworld.jp/event/event_info/15821/',
  'verified','published','kamogawa-beluga-50th-2026',now(),'not_used'
),
(
  'metsa-harvest-2026','ムーミンバレーパークのハーベスト 2026',
  '2026-09-12','2026-10-25',null,null,true,'continuous',
  'ムーミンバレーパーク','357-0001','埼玉県','飯能市','宮沢327-6','exact_address',true,
  'パーク入場料金は公式料金案内を確認','paid',false,null,null,'株式会社ムーミン物語',
  'https://metsa-hanno.com/event/47103/',
  array['nature','entertainment'],'{}',false,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-metsa'),
  'event-47103','https://metsa-hanno.com/event/47103/',
  'verified','published','metsa-harvest-2026',now(),'not_used'
),
(
  'metsa-fika-20261004','ムーミン谷のフィーカ2026 スノークのおじょうさん・リトルミイ',
  '2026-10-04','2026-10-04','13:00','14:00',false,'single',
  'ムーミンバレーパーク KOKEMUS 2F ライブラリーカフェ','357-0001','埼玉県','飯能市','宮沢327-6','exact_address',true,
  'おとな・こども共通 1人5,000円（税込）','paid',false,true,'予約必須・販売30席','株式会社ムーミン物語',
  'https://metsa-hanno.com/event/47406/',
  array['food','entertainment'],array['family'],true,'general',false,
  '{}',null,
  (select id from public.regional_sources where source_key='official-metsa'),
  'event-47406','https://metsa-hanno.com/event/47406/',
  'verified','published','metsa-fika-20261004',now(),'not_used'
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
select e.id,v.d,v.t1,v.t2,'scheduled','official schedule'
from public.events e
join (
  values
    ('water-kendama-20260921','2026-09-21'::date,'11:00'::time,null::time),
    ('water-kendama-20260921','2026-09-21'::date,'13:30'::time,null::time),
    ('water-clown-rio-20260922','2026-09-22'::date,'11:00'::time,null::time),
    ('water-clown-rio-20260922','2026-09-22'::date,'13:30'::time,null::time),
    ('water-seoppi-20260923','2026-09-23'::date,'11:00'::time,null::time),
    ('water-seoppi-20260923','2026-09-23'::date,'13:30'::time,null::time)
) v(slug,d,t1,t2) on e.slug=v.slug
on conflict do nothing;

insert into public.event_occurrences(event_id,occurrence_date,start_time,end_time,status,source_note)
select e.id,v.d,v.t1,v.t2,'scheduled','official schedule'
from public.events e
join (
  values
    ('tdc-hybrid-training-2026','2026-10-19'::date,'19:00'::time,'20:30'::time),
    ('tdc-hybrid-training-2026','2026-10-19'::date,'20:30'::time,'22:00'::time),
    ('tdc-hybrid-training-2026','2026-10-20'::date,'19:00'::time,'20:30'::time),
    ('tdc-hybrid-training-2026','2026-10-20'::date,'20:30'::time,'22:00'::time),
    ('tdc-hybrid-training-2026','2026-10-21'::date,'20:30'::time,'22:00'::time),
    ('tdc-hybrid-training-2026','2026-10-22'::date,'20:30'::time,'22:00'::time)
) v(slug,d,t1,t2) on e.slug=v.slug
on conflict do nothing;

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
where e.slug='miraikan-moon-2026'
on conflict do nothing;

insert into public.event_occurrences(event_id,occurrence_date,start_time,status,source_note)
select e.id,v.d,v.t,'scheduled','official schedule'
from public.events e
join (
  values
    ('2026-09-23'::date,'12:00'::time),('2026-09-23'::date,'14:00'::time),('2026-09-23'::date,'16:00'::time),
    ('2026-09-30'::date,'12:00'::time),('2026-09-30'::date,'14:00'::time),('2026-09-30'::date,'16:00'::time)
) v(d,t) on e.slug='toyosu-kamimaro-202609'
on conflict do nothing;

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'venue_collaboration','verified','https://ariake.shopping-sumitomo-rd.com/event/3843/',now()
from public.events e
join public.fandom_entities f on f.slug='quizknock'
where e.slug='ariake-quizknock-nazotoki-2026'
on conflict(event_id,fandom_id) do update set
  relation_type=excluded.relation_type,
  verification_status='verified',
  source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at,
  updated_at=now();

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'licensed_collaboration','verified','https://tokyo-joypolis.com/event/sidem_jp2026/index.html',now()
from public.events e
join public.fandom_entities f on f.slug='idolmaster-sidem'
where e.slug='joypolis-sidem-3-2026'
on conflict(event_id,fandom_id) do update set
  relation_type=excluded.relation_type,
  verification_status='verified',
  source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at,
  updated_at=now();

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'venue_collaboration','verified','https://mitsui-shopping-park.com/lalaport/tokyo-bay/event/3612314.html',now()
from public.events e
join public.fandom_entities f on f.slug='jujutsu-kaisen'
where e.slug='lalaport-jujutsu-5th-2026'
on conflict(event_id,fandom_id) do update set
  relation_type=excluded.relation_type,
  verification_status='verified',
  source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at,
  updated_at=now();

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'venue_collaboration','verified','https://www.tokyo-dome.co.jp/event/city/musical-toukenranbu_autumn2026.html',now()
from public.events e
join public.fandom_entities f on f.slug='touken-ranbu'
where e.slug='tdc-toukenranbu-return-2026'
on conflict(event_id,fandom_id) do update set
  relation_type=excluded.relation_type,
  verification_status='verified',
  source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at,
  updated_at=now();

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'official_event','verified','https://metsa-hanno.com/event/47103/',now()
from public.events e
join public.fandom_entities f on f.slug='moomin'
where e.slug='metsa-harvest-2026'
on conflict(event_id,fandom_id) do update set
  relation_type=excluded.relation_type,
  verification_status='verified',
  source_url=excluded.source_url,
  last_verified_at=excluded.last_verified_at,
  updated_at=now();

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'official_event','verified','https://metsa-hanno.com/event/47406/',now()
from public.events e
join public.fandom_entities f on f.slug='moomin'
where e.slug='metsa-fika-20261004'
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
  'water-kendama-20260921','water-clown-rio-20260922','water-seoppi-20260923',
  'miraikan-moon-2026','city-circuit-kart-ev-20260923','littleplanet-halloween-divercity-2026',
  'ariake-quizknock-nazotoki-2026','joypolis-sidem-3-2026','toyosu-kamimaro-202609','dainankyoku-2026',
  'sunshine-gashapon-tours-2026','tdc-hybrid-training-2026','tdc-toukenranbu-return-2026',
  'lalaport-jujutsu-5th-2026','kamogawa-beluga-50th-2026','metsa-harvest-2026','metsa-fika-20261004'
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
