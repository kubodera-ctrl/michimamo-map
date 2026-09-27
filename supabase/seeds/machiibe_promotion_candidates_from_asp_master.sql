-- Machiibe promotion candidates imported from the Drive ASP master.
-- These are management candidates only. No Machiibe-specific ad tag/media approval
-- has been confirmed here, so every row remains disabled and reward_mode=none.

begin;

insert into public.machiibe_promotions(
  source_master_id,promotion_type,provider_name,advertiser_name,campaign_name,category,
  placement_keys,tags,approval_status,machiibe_media_approval,target_url,reward_mode,
  enabled,disclosure_label,last_checked_at,source_ref,notes
) values
(
  '26','asp','A8.net',null,'予約ができるスマート駐車場【アキッパ（akippa）】','駐車場',
  array['event_detail','access','car_outing'],array['parking','family_outing'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 掲載準備',
  'まちイベはポイント還元なし。まちイベ媒体承認と専用タグ確認後のみURLを設定してON。'
),
(
  '55','asp','バリューコマース','アソビュー株式会社','遊び予約／レジャーチケット購入サイト「アソビュー！」','レジャー・体験予約',
  array['home_feature','event_detail','experience','rainy_day','family'],array['experience','ticket','family'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  'まちイベ媒体承認は別途未確認。既存みちまも媒体用タグを流用しない。'
),
(
  '61','asp','バリューコマース','Klook Travel Technology合同会社','Klook','旅行・レジャー・体験',
  array['event_detail','experience','ticket','transport'],array['travel','experience','ticket','transport'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  'TDR/USJ等の対象外条件あり。まちイベ媒体承認・専用タグ確認後のみ掲載。'
),
(
  '62','asp','バリューコマース','株式会社KKDAY JAPAN','KKday','旅行・レジャー・体験',
  array['event_detail','experience','ticket','transport'],array['travel','experience','ticket','transport'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  '日本語サイト・日本円等の成果条件あり。まちイベ媒体承認・専用タグ確認後のみ掲載。'
),
(
  '86','asp','バリューコマース','株式会社アドベンチャー','skyticket レンタカー','お出かけ・旅行／レンタカー',
  array['event_detail','access','transport'],array['car','transport','travel'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  '既存登録媒体はみちまもMAP。まちイベ適用範囲確認後のみ掲載。'
),
(
  '92','asp','バリューコマース','株式会社ジェイトリップ','J-TRIP 国内旅行','旅行・国内ツアー',
  array['event_detail','travel','lodging'],array['travel','flight','lodging'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  '遠方イベント向け。まちイベ媒体登録・承認と専用タグ確認後のみ掲載。'
),
(
  '93','asp','バリューコマース','株式会社アクティビティジャパン','アクティビティジャパン','旅行・レジャー・体験',
  array['home_feature','event_detail','experience','weekend'],array['experience','leisure','family'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  'テーマパークチケット指定URL等の対象外条件あり。まちイベ媒体承認後のみ掲載。'
),
(
  '95','asp','バリューコマース','株式会社リクルート','じゃらんパック','旅行・航空券＋宿泊',
  array['event_detail','travel','lodging','transport'],array['travel','flight','lodging'],
  'approved','pending',null,'none',false,'PR','2026-09-25',
  'Drive: まちまも・まちイベ ASP案件マスター / 承認済み',
  '遠方イベント向け。まちイベ媒体承認・専用タグ確認後のみ掲載。'
)
on conflict(source_master_id) do update set
  provider_name=excluded.provider_name,
  advertiser_name=excluded.advertiser_name,
  campaign_name=excluded.campaign_name,
  category=excluded.category,
  placement_keys=excluded.placement_keys,
  tags=excluded.tags,
  approval_status=excluded.approval_status,
  reward_mode='none',
  enabled=false,
  last_checked_at=excluded.last_checked_at,
  source_ref=excluded.source_ref,
  notes=excluded.notes,
  updated_at=now();

commit;
