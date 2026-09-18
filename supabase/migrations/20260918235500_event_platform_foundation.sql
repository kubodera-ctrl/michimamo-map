-- Machimamo Events E0 foundation.
-- Shared Supabase backend, isolated public RPC surface.
begin;

create table if not exists public.regional_sources (
  id bigint generated always as identity primary key,
  source_key text not null unique,
  name text not null,
  source_kind text not null
    check (source_kind in ('official_api','open_data','rss','manual','provider_submission','partner_feed')),
  homepage_url text not null,
  data_url text,
  terms_url text,
  license_text text,
  prefecture text,
  municipality text,
  event_use_allowed boolean not null default false,
  image_policy text not null default 'not_used'
    check (image_policy in ('not_used','link_only','reuse_allowed','permission_required')),
  notes text,
  is_active boolean not null default true,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{2,159}$'),
  title text not null check (char_length(title) between 1 and 300),
  summary text,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  timezone text not null default 'Asia/Tokyo',
  all_day boolean not null default true,

  venue_name text,
  postal_code text,
  prefecture text not null,
  municipality text,
  address text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),

  price_text text,
  is_free boolean,
  reservation_required boolean,
  reservation_text text,
  organizer_name text,
  official_url text not null,
  ticket_url text,

  category_keys text[] not null default '{}',
  age_group_keys text[] not null default '{}',
  indoor boolean,

  image_url text,
  image_source_url text,
  image_license text,
  image_usage_status text not null default 'not_used'
    check (image_usage_status in ('not_used','allowed','link_only','permission_required')),

  source_id bigint not null references public.regional_sources(id),
  source_event_key text,
  source_page_url text not null,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),

  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','needs_review')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','expired','hidden')),
  dedupe_key text,
  duplicate_group text,
  expires_at timestamptz,
  last_verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null))
);

create table if not exists public.event_source_records (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.regional_sources(id) on delete cascade,
  source_event_key text not null,
  event_id bigint references public.events(id) on delete set null,
  source_title text,
  source_start_date date,
  source_end_date date,
  source_venue_name text,
  source_url text not null,
  content_hash text,
  normalization_status text not null default 'pending'
    check (normalization_status in ('pending','normalized','needs_review','ignored')),
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, source_event_key)
);

create index if not exists events_public_date_idx
  on public.events(publication_status, verification_status, start_date, end_date);
create index if not exists events_prefecture_date_idx
  on public.events(prefecture, start_date, end_date)
  where publication_status = 'published' and verification_status = 'verified';
create index if not exists events_categories_gin_idx
  on public.events using gin(category_keys);
create index if not exists events_age_groups_gin_idx
  on public.events using gin(age_group_keys);
create index if not exists events_dedupe_key_idx
  on public.events(dedupe_key) where dedupe_key is not null;
create unique index if not exists events_source_key_unique_idx
  on public.events(source_id, source_event_key)
  where source_event_key is not null;

alter table public.regional_sources enable row level security;
alter table public.events enable row level security;
alter table public.event_source_records enable row level security;

revoke all on table public.regional_sources from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_source_records from anon, authenticated;

create or replace function public.search_public_events(
  p_start_date date default current_date,
  p_end_date date default (current_date + 30),
  p_prefecture text default null,
  p_keyword text default null,
  p_categories text[] default null,
  p_age_groups text[] default null,
  p_free_only boolean default false,
  p_indoor_only boolean default false,
  p_limit integer default 60,
  p_offset integer default 0
)
returns table(
  id bigint,
  slug text,
  title text,
  summary text,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  all_day boolean,
  venue_name text,
  prefecture text,
  municipality text,
  address text,
  latitude double precision,
  longitude double precision,
  price_text text,
  is_free boolean,
  reservation_required boolean,
  organizer_name text,
  official_url text,
  category_keys text[],
  age_group_keys text[],
  indoor boolean,
  image_url text,
  source_name text,
  source_url text,
  source_updated_at timestamptz,
  last_verified_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    e.id,
    e.slug,
    e.title,
    e.summary,
    e.start_date,
    e.end_date,
    e.start_time,
    e.end_time,
    e.all_day,
    e.venue_name,
    e.prefecture,
    e.municipality,
    e.address,
    e.latitude,
    e.longitude,
    e.price_text,
    e.is_free,
    e.reservation_required,
    e.organizer_name,
    e.official_url,
    e.category_keys,
    e.age_group_keys,
    e.indoor,
    case when e.image_usage_status = 'allowed' then e.image_url else null end,
    s.name,
    coalesce(e.source_page_url, s.data_url, s.homepage_url),
    e.source_updated_at,
    e.last_verified_at,
    e.updated_at
  from public.events e
  join public.regional_sources s on s.id = e.source_id
  where e.publication_status = 'published'
    and e.verification_status = 'verified'
    and s.is_active = true
    and s.event_use_allowed = true
    and e.end_date >= coalesce(p_start_date, current_date)
    and e.start_date <= coalesce(p_end_date, current_date + 30)
    and (p_prefecture is null or btrim(p_prefecture) = '' or e.prefecture = btrim(p_prefecture))
    and (
      p_keyword is null or btrim(p_keyword) = ''
      or e.title ilike '%' || btrim(p_keyword) || '%'
      or coalesce(e.venue_name,'') ilike '%' || btrim(p_keyword) || '%'
      or coalesce(e.municipality,'') ilike '%' || btrim(p_keyword) || '%'
      or coalesce(e.organizer_name,'') ilike '%' || btrim(p_keyword) || '%'
    )
    and (p_categories is null or cardinality(p_categories) = 0 or e.category_keys && p_categories)
    and (p_age_groups is null or cardinality(p_age_groups) = 0 or e.age_group_keys && p_age_groups)
    and (not coalesce(p_free_only,false) or e.is_free is true)
    and (not coalesce(p_indoor_only,false) or e.indoor is true)
    and (e.expires_at is null or e.expires_at > now())
  order by e.start_date, e.start_time nulls first, e.title
  limit least(greatest(coalesce(p_limit,60),1),100)
  offset greatest(coalesce(p_offset,0),0);
$$;

revoke all on function public.search_public_events(date,date,text,text,text[],text[],boolean,boolean,integer,integer)
  from public, anon, authenticated;
grant execute on function public.search_public_events(date,date,text,text,text[],text[],boolean,boolean,integer,integer)
  to anon, authenticated;

create or replace function public.get_public_event(p_slug text)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select to_jsonb(x)
  from (
    select
      e.id,
      e.slug,
      e.title,
      e.summary,
      e.start_date,
      e.end_date,
      e.start_time,
      e.end_time,
      e.timezone,
      e.all_day,
      e.venue_name,
      e.postal_code,
      e.prefecture,
      e.municipality,
      e.address,
      e.latitude,
      e.longitude,
      e.price_text,
      e.is_free,
      e.reservation_required,
      e.reservation_text,
      e.organizer_name,
      e.official_url,
      e.ticket_url,
      e.category_keys,
      e.age_group_keys,
      e.indoor,
      case when e.image_usage_status = 'allowed' then e.image_url else null end as image_url,
      case when e.image_usage_status = 'allowed' then e.image_source_url else null end as image_source_url,
      case when e.image_usage_status = 'allowed' then e.image_license else null end as image_license,
      s.name as source_name,
      coalesce(e.source_page_url, s.data_url, s.homepage_url) as source_url,
      e.source_updated_at,
      e.fetched_at,
      e.last_verified_at,
      e.updated_at
    from public.events e
    join public.regional_sources s on s.id = e.source_id
    where e.slug = p_slug
      and e.publication_status = 'published'
      and e.verification_status = 'verified'
      and s.is_active = true
      and s.event_use_allowed = true
      and (e.expires_at is null or e.expires_at > now())
    limit 1
  ) x;
$$;

revoke all on function public.get_public_event(text) from public, anon, authenticated;
grant execute on function public.get_public_event(text) to anon, authenticated;

create or replace function public.get_public_event_sitemap(p_limit integer default 50000)
returns table(slug text, updated_at timestamptz)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select e.slug, e.updated_at
  from public.events e
  join public.regional_sources s on s.id = e.source_id
  where e.publication_status = 'published'
    and e.verification_status = 'verified'
    and s.is_active = true
    and s.event_use_allowed = true
    and e.end_date >= current_date - 7
    and (e.expires_at is null or e.expires_at > now())
  order by e.updated_at desc
  limit least(greatest(coalesce(p_limit,50000),1),50000);
$$;

revoke all on function public.get_public_event_sitemap(integer) from public, anon, authenticated;
grant execute on function public.get_public_event_sitemap(integer) to anon, authenticated;

comment on table public.regional_sources is
  '共通地域情報エンジンの情報源台帳。利用条件と画像条件を確認してからevent_use_allowedをtrueにする。';
comment on table public.events is
  'まちまもイベントの正規化済みcanonical event。公開と確認を分離し、事実項目を推測で埋めない。';
comment on table public.event_source_records is
  '取得元ごとのイベント記録とcanonical eventの紐付け。重複・更新追跡用。';

commit;
