-- Machiibe national ingestion foundation.
-- Additive contract only. Do not apply to Production without explicit release approval.

begin;

alter table public.regional_sources
  add column if not exists fetch_method text
    check (fetch_method is null or fetch_method in ('OPEN_DATA','RSS','ICS','JSON_API','JSON_LD','HTML_STRUCTURED','MANUAL','PARTNER')),
  add column if not exists robots_status text not null default 'pending'
    check (robots_status in ('pending','allowed','disallowed','not_applicable')),
  add column if not exists commercial_use_status text not null default 'unknown'
    check (commercial_use_status in ('unknown','allowed','conditional','disallowed')),
  add column if not exists attribution_requirement text,
  add column if not exists update_frequency_minutes integer
    check (update_frequency_minutes is null or update_frequency_minutes between 15 and 525600),
  add column if not exists last_checked_at timestamptz,
  add column if not exists priority smallint not null default 50
    check (priority between 1 and 100),
  add column if not exists source_etag text,
  add column if not exists source_last_modified text;

alter table public.events
  add column if not exists image_display_allowed boolean,
  add column if not exists image_cache_allowed boolean,
  add column if not exists image_sns_allowed boolean,
  add column if not exists image_commercial_allowed boolean,
  add column if not exists image_attribution text;

create table if not exists public.machiibe_duplicate_candidates (
  id bigint generated always as identity primary key,
  left_ingest_item_id bigint not null references public.machiibe_ingest_items(id) on delete cascade,
  right_ingest_item_id bigint not null references public.machiibe_ingest_items(id) on delete cascade,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  signals jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','merged','not_duplicate','needs_review','ignored')),
  canonical_event_id bigint references public.events(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_ingest_item_id<>right_ingest_item_id)
);

create unique index if not exists machiibe_duplicate_pair_unique_idx
  on public.machiibe_duplicate_candidates(
    least(left_ingest_item_id,right_ingest_item_id),
    greatest(left_ingest_item_id,right_ingest_item_id)
  );

create index if not exists machiibe_duplicate_review_idx
  on public.machiibe_duplicate_candidates(status,confidence desc,created_at);

create table if not exists public.machiibe_event_change_log (
  id bigint generated always as identity primary key,
  canonical_event_id bigint references public.events(id) on delete cascade,
  ingest_item_id bigint references public.machiibe_ingest_items(id) on delete set null,
  change_kind text not null
    check (change_kind in ('new','content_changed','date_changed','venue_changed','price_changed','cancelled','postponed','expired','restored')),
  previous_source_hash text,
  new_source_hash text,
  changed_fields text[] not null default '{}',
  before_snapshot jsonb,
  after_snapshot jsonb,
  detected_at timestamptz not null default now()
);

create index if not exists machiibe_event_change_event_idx
  on public.machiibe_event_change_log(canonical_event_id,detected_at desc);

create or replace view public.machiibe_source_health_summary
with (security_invoker=true)
as
select
  rs.id as source_id,
  rs.name as source_name,
  rs.prefecture,
  rs.municipality,
  rs.fetch_method,
  rs.fetch_status,
  rs.is_active as active,
  rs.priority,
  rs.last_checked_at,
  rs.last_success_at,
  rs.last_failure_at,
  rs.consecutive_failures as failure_count,
  case
    when not rs.is_active then 'disabled'
    when rs.last_success_at is null then 'never_succeeded'
    when rs.update_frequency_minutes is not null
      and rs.last_success_at < now()-(rs.update_frequency_minutes*2||' minutes')::interval then 'stale'
    when rs.consecutive_failures>0 then 'degraded'
    else 'healthy'
  end as freshness_status
from public.regional_sources rs;

alter table public.machiibe_duplicate_candidates enable row level security;
alter table public.machiibe_event_change_log enable row level security;
revoke all on table public.machiibe_duplicate_candidates from anon,authenticated;
revoke all on table public.machiibe_event_change_log from anon,authenticated;
revoke all on table public.machiibe_source_health_summary from anon,authenticated;

comment on table public.machiibe_duplicate_candidates is 'Cross-source duplicate candidates; uncertain matches require review instead of automatic merge.';
comment on table public.machiibe_event_change_log is 'Source-hash based change detection history for updates/cancellations/postponements/expiry.';
comment on view public.machiibe_source_health_summary is 'Operations-facing source freshness and failure summary; not a public search surface.';


create extension if not exists pg_trgm;

create index if not exists events_search_cursor_idx
  on public.events(start_date,id)
  where publication_status='published' and verification_status='verified';
create index if not exists events_pref_muni_cursor_idx
  on public.events(prefecture,municipality,start_date,id)
  where publication_status='published' and verification_status='verified';
create index if not exists events_price_cursor_idx
  on public.events(price_type,start_date,id)
  where publication_status='published' and verification_status='verified';
create index if not exists events_indoor_cursor_idx
  on public.events(indoor,start_date,id)
  where publication_status='published' and verification_status='verified';
create index if not exists events_title_trgm_idx
  on public.events using gin (title gin_trgm_ops);
create index if not exists events_venue_trgm_idx
  on public.events using gin (venue_name gin_trgm_ops);
create index if not exists events_municipality_trgm_idx
  on public.events using gin (municipality gin_trgm_ops);

create or replace function public.search_public_events_cursor_v2(
  p_start_date date,
  p_end_date date,
  p_prefecture text default null,
  p_municipality text default null,
  p_keyword text default null,
  p_categories text[] default null,
  p_price_types text[] default null,
  p_family_only boolean default false,
  p_indoor_only boolean default false,
  p_after_start_date date default null,
  p_after_id bigint default null,
  p_limit integer default 24
)
returns table(
  id bigint,
  slug text,
  title text,
  start_date date,
  end_date date,
  prefecture text,
  municipality text,
  venue_name text,
  price_type text,
  indoor boolean,
  audience_intent text,
  category_keys text[]
)
language sql
security definer
stable
set search_path=public,pg_temp
as $$
  select
    e.id,e.slug,e.title,e.start_date,e.end_date,e.prefecture,e.municipality,e.venue_name,
    e.price_type,e.indoor,
    case when e.audience_intent_verified then e.audience_intent else 'general' end,
    e.category_keys
  from public.events e
  join public.regional_sources s on s.id=e.source_id
  where e.publication_status='published'
    and e.verification_status='verified'
    and s.is_active and s.event_use_allowed
    and (e.expires_at is null or e.expires_at>now())
    and (
      (e.schedule_type in ('single','continuous') and e.start_date<=p_end_date and e.end_date>=p_start_date)
      or
      (e.schedule_type in ('recurring','irregular') and exists(
        select 1
        from public.event_occurrences eo
        where eo.event_id=e.id
          and eo.occurrence_date between p_start_date and p_end_date
          and eo.status='scheduled'
      ))
    )
    and (p_prefecture is null or e.prefecture=p_prefecture)
    and (p_municipality is null or e.municipality=p_municipality)
    and (
      p_keyword is null or btrim(p_keyword)=''
      or e.title ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.summary,'') ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.venue_name,'') ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.municipality,'') ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.organizer_name,'') ilike '%'||left(btrim(p_keyword),100)||'%'
    )
    and (p_categories is null or cardinality(p_categories)=0 or e.category_keys&&p_categories[1:20])
    and (p_price_types is null or cardinality(p_price_types)=0 or e.price_type=any(p_price_types[1:10]))
    and (
      not p_family_only
      or (e.audience_intent_verified and e.audience_intent in ('child_centered','family_friendly'))
    )
    and (not p_indoor_only or e.indoor is true)
    and (
      p_after_start_date is null
      or (e.start_date,e.id)>(p_after_start_date,coalesce(p_after_id,0))
    )
  order by e.start_date,e.id
  limit least(greatest(coalesce(p_limit,24),1),100);
$$;

revoke all on function public.search_public_events_cursor_v2(date,date,text,text,text,text[],text[],boolean,boolean,date,bigint,integer)
  from public;
grant execute on function public.search_public_events_cursor_v2(date,date,text,text,text,text[],text[],boolean,boolean,date,bigint,integer)
  to anon,authenticated;

create table if not exists public.machiibe_media_assets (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('event','venue','category','generic')),
  subject_ref text not null,
  media_role text not null check (media_role in ('event_official','venue_official','place_photo','category_visual','generic_fallback')),
  media_url text check (media_url is null or media_url ~* '^https?://'),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  display_allowed boolean,
  cache_allowed boolean,
  commercial_allowed boolean,
  sns_allowed boolean,
  attribution_required boolean,
  attribution_text text,
  rights_status text not null default 'unknown'
    check (rights_status in ('unknown','reviewed_allowed','reviewed_restricted','permission_required','blocked','machiibe_owned')),
  rights_reviewed_at timestamptz,
  cache_object_key text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint machiibe_media_cache_gate_ck check (
    cache_object_key is null or cache_allowed is true or rights_status='machiibe_owned'
  ),
  constraint machiibe_media_sns_gate_ck check (
    coalesce(sns_allowed,false)=false
    or (
      display_allowed is true
      and commercial_allowed is true
      and rights_status in ('reviewed_allowed','machiibe_owned')
    )
  )
);

create index if not exists machiibe_media_assets_subject_idx
  on public.machiibe_media_assets(subject_type,subject_ref,active,media_role);

alter table public.machiibe_media_assets enable row level security;
revoke all on table public.machiibe_media_assets from anon,authenticated;
comment on table public.machiibe_media_assets is 'Rights-aware event/venue/place/category media candidates. Unknown rights never imply display/cache/SNS permission.';

commit;
