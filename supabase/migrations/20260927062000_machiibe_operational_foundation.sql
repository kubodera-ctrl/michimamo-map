-- Machiibe operational foundation for ingestion, production, publishing and promotions.
-- Additive only. Not applied to production until Preview/CI and cross-Work re-audit pass.

begin;

-- ---------------------------------------------------------------------------
-- Event ingestion / provenance
-- ---------------------------------------------------------------------------

alter table public.regional_sources
  add column if not exists source_language text not null default 'ja'
    check (char_length(source_language) between 2 and 16);

alter table public.event_source_records
  add column if not exists source_language text not null default 'ja'
    check (char_length(source_language) between 2 and 16),
  add column if not exists terms_status text,
  add column if not exists raw_hash text,
  add column if not exists raw_object_key text,
  add column if not exists canonical_event_id bigint references public.events(id) on delete set null;

update public.event_source_records
set raw_hash=coalesce(raw_hash,content_hash),
    canonical_event_id=coalesce(canonical_event_id,event_id)
where raw_hash is null or canonical_event_id is null;

create table if not exists public.machiibe_ingest_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id bigint references public.regional_sources(id) on delete set null,
  queue_name text not null default 'machiibe-ingest',
  idempotency_key text not null unique,
  status text not null default 'queued'
    check (status in ('queued','fetching','normalizing','completed','failed','dead_letter')),
  request_id text,
  correlation_id text,
  requested_by text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_code text,
  error_message text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists machiibe_ingest_jobs_status_idx
  on public.machiibe_ingest_jobs(status,requested_at);
create index if not exists machiibe_ingest_jobs_source_idx
  on public.machiibe_ingest_jobs(source_id,requested_at desc);

create table if not exists public.machiibe_ingest_items (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.machiibe_ingest_jobs(id) on delete cascade,
  source_id bigint references public.regional_sources(id) on delete set null,
  source_name text,
  source_type text,
  source_event_id text,
  source_url text not null check (source_url ~* '^https?://'),
  source_language text not null default 'ja'
    check (char_length(source_language) between 2 and 16),
  terms_status text,
  raw_hash text not null,
  raw_object_key text,
  fetched_at timestamptz not null default now(),
  last_verified_at timestamptz,
  canonical_event_id bigint references public.events(id) on delete set null,
  normalization_status text not null default 'pending'
    check (normalization_status in ('pending','normalized','needs_review','ignored','failed')),
  dedupe_key text,
  venue_status text not null default 'pending'
    check (venue_status in ('pending','resolved','needs_review','not_applicable')),
  category_status text not null default 'pending'
    check (category_status in ('pending','resolved','needs_review','not_applicable')),
  translation_status text not null default 'pending'
    check (translation_status in ('pending','ready','needs_review','not_required','failed')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id,source_event_id,raw_hash)
);

create index if not exists machiibe_ingest_items_job_idx
  on public.machiibe_ingest_items(job_id,id);
create index if not exists machiibe_ingest_items_canonical_idx
  on public.machiibe_ingest_items(canonical_event_id);
create index if not exists machiibe_ingest_items_status_idx
  on public.machiibe_ingest_items(normalization_status,fetched_at);

create or replace view public.machiibe_event_provenance
with (security_invoker=true)
as
select
  esr.id as source_record_id,
  e.id as canonical_event_id,
  e.slug,
  coalesce(esr.source_url,e.source_page_url) as source_url,
  rs.name as source_name,
  rs.source_kind as source_type,
  esr.source_event_key as source_event_id,
  esr.fetched_at,
  e.last_verified_at,
  coalesce(esr.source_language,rs.source_language,'ja') as source_language,
  coalesce(esr.terms_status,rs.terms_review_status) as terms_status,
  coalesce(esr.raw_hash,esr.content_hash) as raw_hash
from public.event_source_records esr
join public.regional_sources rs on rs.id=esr.source_id
left join public.events e on e.id=coalesce(esr.canonical_event_id,esr.event_id);

create or replace function public.get_public_event_provenance(p_slug text)
returns jsonb
language sql
security definer
stable
set search_path=public,pg_temp
as $$
  select jsonb_build_object(
    'source_url',coalesce(esr.source_url,e.source_page_url,rs.data_url,rs.homepage_url),
    'source_name',rs.name,
    'source_type',rs.source_kind,
    'source_event_id',coalesce(esr.source_event_key,e.source_event_key),
    'fetched_at',coalesce(esr.fetched_at,e.fetched_at),
    'last_verified_at',e.last_verified_at,
    'source_language',coalesce(esr.source_language,rs.source_language,'ja'),
    'terms_status',coalesce(esr.terms_status,rs.terms_review_status),
    'raw_hash',coalesce(esr.raw_hash,esr.content_hash),
    'canonical_event_id',e.id
  )
  from public.events e
  join public.regional_sources rs on rs.id=e.source_id
  left join lateral (
    select x.*
    from public.event_source_records x
    where x.event_id=e.id or x.canonical_event_id=e.id
    order by x.fetched_at desc,x.id desc
    limit 1
  ) esr on true
  where char_length(coalesce(p_slug,'')) between 3 and 160
    and p_slug ~ '^[a-z0-9][a-z0-9-]{2,159}$'
    and e.slug=p_slug
    and e.publication_status='published'
    and e.verification_status='verified'
    and rs.is_active
    and rs.event_use_allowed
    and (e.expires_at is null or e.expires_at>now())
  limit 1;
$$;

revoke all on function public.get_public_event_provenance(text)
  from public,anon,authenticated;
grant execute on function public.get_public_event_provenance(text)
  to anon,authenticated;

-- ---------------------------------------------------------------------------
-- Shared Production / Publishing foundation
-- ---------------------------------------------------------------------------

create table if not exists public.production_master_registry (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('machiibe','machimamo')),
  production_type text not null check (production_type in ('CAROUSEL','VIDEO','SINGLE','WEEKLY')),
  master_version text not null,
  template_version text,
  endcard_version text,
  source_kind text not null default 'drive_current'
    check (source_kind in ('drive_current','git_snapshot','manual')),
  source_ref text,
  status text not null default 'inactive'
    check (status in ('inactive','active','retired')),
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service,production_type,master_version)
);

create unique index if not exists production_master_one_active_idx
  on public.production_master_registry(service,production_type)
  where status='active';

insert into public.production_master_registry(
  service,production_type,master_version,template_version,endcard_version,source_kind,source_ref,status,activated_at
) values (
  'machiibe',
  'CAROUSEL',
  'machiibe-carousel-production-master-current-20260927',
  'machiibe-carousel-current-20260927',
  'machiibe-endcard-current-20260927',
  'drive_current',
  '02_まちイベ/仕様書・運用マスター/MACHIIBE_PRODUCTION_MASTER_CURRENT.md',
  'active',
  now()
)
on conflict(service,production_type,master_version) do update set
  template_version=excluded.template_version,
  endcard_version=excluded.endcard_version,
  source_kind=excluded.source_kind,
  source_ref=excluded.source_ref,
  status='active',
  activated_at=coalesce(public.production_master_registry.activated_at,now()),
  updated_at=now();

create table if not exists public.publishing_post_sets (
  id uuid primary key default gen_random_uuid(),
  service text not null check (service in ('machiibe','machimamo')),
  production_type text not null check (production_type in ('CAROUSEL','VIDEO','SINGLE','WEEKLY')),
  production_master_version text not null,
  template_version text,
  prefecture text,
  municipality text,
  area_group_id text,
  period_start date,
  period_end date,
  period_label text,
  feature_key text,
  event_count integer not null default 0 check (event_count >= 0),
  part_index integer not null default 1 check (part_index >= 1),
  part_count integer not null default 1 check (part_count >= 1 and part_count >= part_index),
  source_hash text,
  generation_key text not null unique,
  status text not null default 'draft'
    check (status in ('draft','collecting','validating','generated','edited','approved','scheduled','posted','expired','failed','archived')),
  requested_by_user_id uuid,
  requested_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publishing_post_sets_service_status_idx
  on public.publishing_post_sets(service,status,updated_at desc);
create index if not exists publishing_post_sets_period_idx
  on public.publishing_post_sets(service,prefecture,period_start,period_end);

create table if not exists public.publishing_revisions (
  id uuid primary key default gen_random_uuid(),
  post_set_id uuid not null references public.publishing_post_sets(id) on delete cascade,
  revision_number integer not null check (revision_number >= 1),
  production_type text not null check (production_type in ('CAROUSEL','VIDEO','SINGLE','WEEKLY')),
  master_version text not null,
  template_version text,
  status text not null default 'draft'
    check (status in ('draft','collecting','validating','generated','edited','approved','scheduled','posted','failed','archived')),
  input_snapshot jsonb not null default '{}'::jsonb,
  facts_snapshot jsonb not null default '{}'::jsonb,
  rights_manifest jsonb not null default '{}'::jsonb,
  page_plan jsonb not null default '{}'::jsonb,
  caption_snapshot text,
  hashtags_snapshot text[] not null default '{}',
  media_manifest jsonb not null default '[]'::jsonb,
  media_hash text,
  facts_qc text not null default 'pending' check (facts_qc in ('pending','pass','fail')),
  rights_qc text not null default 'pending' check (rights_qc in ('pending','pass','fail')),
  visual_qc text not null default 'pending' check (visual_qc in ('pending','pass','fail')),
  golden_qc text not null default 'pending' check (golden_qc in ('pending','pass','fail')),
  page_count_qc text not null default 'pending' check (page_count_qc in ('pending','pass','fail')),
  disclaimer_qc text not null default 'pending' check (disclaimer_qc in ('pending','pass','fail')),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  publish_eligible boolean not null default false,
  approved_by_user_id uuid,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_set_id,revision_number),
  constraint publishing_revision_publish_gate_ck check (
    not publish_eligible or (
      facts_qc='pass'
      and rights_qc='pass'
      and visual_qc='pass'
      and golden_qc='pass'
      and page_count_qc='pass'
      and disclaimer_qc='pass'
      and approval_status='approved'
    )
  )
);

create index if not exists publishing_revisions_postset_idx
  on public.publishing_revisions(post_set_id,revision_number desc);
create index if not exists publishing_revisions_eligible_idx
  on public.publishing_revisions(publish_eligible,updated_at desc);

create table if not exists public.publishing_platform_posts (
  id uuid primary key default gen_random_uuid(),
  post_set_id uuid not null references public.publishing_post_sets(id) on delete cascade,
  revision_id uuid not null references public.publishing_revisions(id) on delete cascade,
  production_type text not null check (production_type in ('CAROUSEL','VIDEO','SINGLE','WEEKLY')),
  master_version text not null,
  prefecture text,
  period_label text,
  platform text not null check (platform in ('x','tiktok')),
  caption_snapshot text,
  hashtags_snapshot text[] not null default '{}',
  media_manifest jsonb not null default '[]'::jsonb,
  media_hash text,
  status text not null default 'not_requested'
    check (status in ('not_requested','queued','uploading','sent','posting','posted','failed','cancelled')),
  external_status text,
  requested_at timestamptz,
  sent_at timestamptz,
  posted_at timestamptz,
  posted_by_user_id uuid,
  posted_by text,
  external_post_id text,
  publish_id text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  repost_sequence integer not null default 0 check (repost_sequence >= 0),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(revision_id,platform,repost_sequence)
);

create index if not exists publishing_platform_posts_status_idx
  on public.publishing_platform_posts(platform,status,updated_at desc);
create index if not exists publishing_platform_posts_postset_idx
  on public.publishing_platform_posts(post_set_id,platform,created_at desc);

create table if not exists public.publishing_audit_log (
  id bigint generated always as identity primary key,
  service text not null check (service in ('machiibe','machimamo')),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_user_id uuid,
  actor text,
  request_id text,
  correlation_id text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists publishing_audit_entity_idx
  on public.publishing_audit_log(service,entity_type,entity_id,created_at desc);

-- ---------------------------------------------------------------------------
-- Machiibe ASP / Sponsor / PR / Featured / House-ad controls
-- ---------------------------------------------------------------------------

create table if not exists public.machiibe_promotions (
  id uuid primary key default gen_random_uuid(),
  source_master_id text,
  promotion_type text not null check (promotion_type in ('asp','sponsor','pr','featured','house')),
  provider_name text,
  advertiser_name text,
  campaign_name text not null,
  category text,
  placement_keys text[] not null default '{}',
  tags text[] not null default '{}',
  approval_status text not null default 'pending'
    check (approval_status in ('pending','approved','rejected','ended')),
  machiibe_media_approval text not null default 'pending'
    check (machiibe_media_approval in ('pending','approved','rejected','not_required')),
  target_url text check (target_url is null or target_url ~* '^https?://'),
  reward_mode text not null default 'none'
    check (reward_mode in ('none','future_reward_token')),
  enabled boolean not null default false,
  disclosure_label text not null default 'PR',
  starts_at timestamptz,
  ends_at timestamptz,
  last_checked_at timestamptz,
  source_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint machiibe_promotions_enable_gate_ck check (
    not enabled or (
      approval_status='approved'
      and machiibe_media_approval in ('approved','not_required')
      and target_url is not null
    )
  )
);

create unique index if not exists machiibe_promotions_master_id_idx
  on public.machiibe_promotions(source_master_id)
  where source_master_id is not null;
create index if not exists machiibe_promotions_enabled_idx
  on public.machiibe_promotions(enabled,promotion_type,updated_at desc);

-- RLS / direct Data API access is disabled. Server-side admin/service code uses
-- the service role. Public display must go through an explicit gated RPC/API.
alter table public.machiibe_ingest_jobs enable row level security;
alter table public.machiibe_ingest_items enable row level security;
alter table public.production_master_registry enable row level security;
alter table public.publishing_post_sets enable row level security;
alter table public.publishing_revisions enable row level security;
alter table public.publishing_platform_posts enable row level security;
alter table public.publishing_audit_log enable row level security;
alter table public.machiibe_promotions enable row level security;

revoke all on table public.machiibe_ingest_jobs from anon,authenticated;
revoke all on table public.machiibe_ingest_items from anon,authenticated;
revoke all on table public.machiibe_event_provenance from anon,authenticated;
revoke all on table public.production_master_registry from anon,authenticated;
revoke all on table public.publishing_post_sets from anon,authenticated;
revoke all on table public.publishing_revisions from anon,authenticated;
revoke all on table public.publishing_platform_posts from anon,authenticated;
revoke all on table public.publishing_audit_log from anon,authenticated;
revoke all on table public.machiibe_promotions from anon,authenticated;

comment on table public.machiibe_ingest_jobs is 'Cloudflare Queue前提のまちイベ収集ジョブ状態。idempotency/request/correlation/DLQ状態を保持。';
comment on table public.machiibe_ingest_items is '取得したイベント候補のraw hash/R2参照/正規化/重複/会場/カテゴリ/翻訳の処理状態。';
comment on view public.machiibe_event_provenance is 'まちイベ出典契約の標準フィールド。event_source_recordsの既存構造を壊さずAPI名へ正規化する。';
comment on table public.production_master_registry is 'Drive CURRENTをProduction Type単位で管理。Machiibe VIDEOは正式CURRENT登録までactiveにしない。';
comment on table public.publishing_post_sets is '地域・期間・特集単位のProduction Set。';
comment on table public.publishing_revisions is '承認済みRevisionを上書きせず、QC/rights/facts/goldenとmedia manifestを保持する。';
comment on table public.publishing_platform_posts is 'X/TikTokのRevision単位投稿状態。外部投稿完了のみpostedとする。';
comment on table public.machiibe_promotions is 'ASP/スポンサー/PR/注目記事/自社広告。まちイベ媒体承認とURL確認前はenabledにできない。';

commit;
