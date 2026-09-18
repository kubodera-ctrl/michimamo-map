-- まちイベ: analytics / pickup / admin dashboard foundation.
-- Public clients never write these tables directly. Writes happen through server-side service_role only.
begin;

create table if not exists public.event_site_metrics_daily (
  metric_date date not null default ((now() at time zone 'Asia/Tokyo')::date),
  metric text not null,
  event_slug text not null default '',
  count bigint not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key(metric_date, metric, event_slug)
);

create table if not exists public.event_search_terms_daily (
  metric_date date not null default ((now() at time zone 'Asia/Tokyo')::date),
  term_key text not null,
  display_term text not null,
  count bigint not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key(metric_date, term_key)
);

create table if not exists public.event_pickups (
  event_id bigint primary key references public.events(id) on delete cascade,
  rank integer not null default 100 check (rank between 1 and 9999),
  reason text not null default 'manual' check (reason in ('manual','popular_7d')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.event_site_metrics_daily enable row level security;
alter table public.event_search_terms_daily enable row level security;
alter table public.event_pickups enable row level security;

revoke all on table public.event_site_metrics_daily from anon, authenticated;
revoke all on table public.event_search_terms_daily from anon, authenticated;
revoke all on table public.event_pickups from anon, authenticated;

create or replace function public.service_record_machiibe_metric(
  p_metric text,
  p_event_slug text default null,
  p_search_term text default null
)
returns void
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_metric text := lower(btrim(coalesce(p_metric,'')));
  v_slug text := left(btrim(coalesce(p_event_slug,'')),160);
  v_term text := left(regexp_replace(btrim(coalesce(p_search_term,'')), '\s+', ' ', 'g'),80);
  v_term_key text;
begin
  if v_metric not in (
    'page_view','search','event_view','event_open','save_event','unsave_event',
    'attended_event','unattended_event','calendar_google','calendar_ics',
    'map_google','map_apple','parking_search','dining_open',
    'machimamo_map','x_share','admin_x_compose'
  ) then
    raise exception 'unsupported_metric' using errcode='22023';
  end if;

  insert into public.event_site_metrics_daily(metric_date,metric,event_slug,count,updated_at)
  values((now() at time zone 'Asia/Tokyo')::date,v_metric,v_slug,1,now())
  on conflict(metric_date,metric,event_slug)
  do update set count=public.event_site_metrics_daily.count+1,updated_at=now();

  if v_metric='search' and v_term<>'' then
    v_term_key := lower(v_term);
    insert into public.event_search_terms_daily(metric_date,term_key,display_term,count,updated_at)
    values((now() at time zone 'Asia/Tokyo')::date,v_term_key,v_term,1,now())
    on conflict(metric_date,term_key)
    do update set
      count=public.event_search_terms_daily.count+1,
      display_term=excluded.display_term,
      updated_at=now();
  end if;
end;
$$;

revoke all on function public.service_record_machiibe_metric(text,text,text) from public, anon, authenticated;
grant execute on function public.service_record_machiibe_metric(text,text,text) to service_role;

create or replace function public.service_get_machiibe_admin_dashboard(p_days integer default 30)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
with
period_cfg as (
  select greatest(1,least(coalesce(p_days,30),365))::integer as days
),
metric_rows as (
  select m.*
  from public.event_site_metrics_daily m, period_cfg w
  where m.metric_date >= ((now() at time zone 'Asia/Tokyo')::date - (w.days-1))
),
search_rank as (
  select
    min(s.display_term) as term,
    sum(s.count)::bigint as count
  from public.event_search_terms_daily s, period_cfg w
  where s.metric_date >= ((now() at time zone 'Asia/Tokyo')::date - (w.days-1))
  group by s.term_key
  order by count desc, term
  limit 30
),
event_rank as (
  select
    e.id,e.slug,e.title,e.start_date,e.end_date,e.prefecture,e.municipality,e.venue_name,
    sum(m.count)::bigint as count
  from metric_rows m
  join public.events e on e.slug=m.event_slug
  join public.regional_sources rs on rs.id=e.source_id
  where m.metric='event_view'
    and e.publication_status='published'
    and e.verification_status='verified'
    and rs.is_active and rs.event_use_allowed
  group by e.id,e.slug,e.title,e.start_date,e.end_date,e.prefecture,e.municipality,e.venue_name
  order by count desc,e.start_date,e.title
  limit 30
),
detected as (
  select
    esr.id,
    esr.source_title,
    esr.source_url,
    esr.normalization_status,
    esr.fetched_at,
    e.id as event_id,
    e.slug,
    e.title,
    e.start_date,
    e.end_date,
    e.prefecture,
    e.municipality,
    e.venue_name,
    e.publication_status,
    e.verification_status,
    e.event_status,
    coalesce(xstats.compose_count,0)::bigint as x_compose_count,
    xstats.last_opened_at as x_last_opened_at
  from public.event_source_records esr
  left join public.events e on e.id=esr.event_id
  left join lateral (
    select sum(m.count)::bigint as compose_count,max(m.updated_at) as last_opened_at
    from public.event_site_metrics_daily m
    where m.metric='admin_x_compose' and m.event_slug=e.slug
  ) xstats on true
  order by esr.fetched_at desc
  limit 40
),
pickup_rows as (
  select
    p.event_id,p.rank,p.reason,p.updated_at,
    e.slug,e.title,e.start_date,e.end_date,e.prefecture,e.municipality,e.venue_name
  from public.event_pickups p
  join public.events e on e.id=p.event_id
  where p.is_active
  order by p.rank,e.start_date,e.title
  limit 12
)
select jsonb_build_object(
  'summary',jsonb_build_object(
    'pv',coalesce((select sum(count) from metric_rows where metric='page_view'),0),
    'searches',coalesce((select sum(count) from metric_rows where metric='search'),0),
    'calendarAdds',coalesce((select sum(count) from metric_rows where metric in ('calendar_google','calendar_ics')),0),
    'machimamoClicks',coalesce((select sum(count) from metric_rows where metric='machimamo_map'),0),
    'xShares',coalesce((select sum(count) from metric_rows where metric='x_share'),0),
    'eventOpens',coalesce((select sum(count) from metric_rows where metric='event_view'),0),
    'lineAuthUsers',(select count(*) from auth.users),
    'linkedProfiles',(select count(*) from public.profiles where auth_id is not null)
  ),
  'searchTerms',coalesce((select jsonb_agg(to_jsonb(x) order by x.count desc,x.term) from search_rank x),'[]'::jsonb),
  'popularEvents',coalesce((select jsonb_agg(to_jsonb(x) order by x.count desc,x.start_date,x.title) from event_rank x),'[]'::jsonb),
  'newDetected',coalesce((select jsonb_agg(to_jsonb(x) order by x.fetched_at desc) from detected x),'[]'::jsonb),
  'pickups',coalesce((select jsonb_agg(to_jsonb(x) order by x.rank,x.start_date,x.title) from pickup_rows x),'[]'::jsonb)
);
$$;

revoke all on function public.service_get_machiibe_admin_dashboard(integer) from public, anon, authenticated;
grant execute on function public.service_get_machiibe_admin_dashboard(integer) to service_role;

create or replace function public.service_refresh_machiibe_pickups(p_limit integer default 6)
returns integer
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
declare
  v_limit integer := greatest(1,least(coalesce(p_limit,6),12));
  v_count integer;
begin
  delete from public.event_pickups where reason='popular_7d';

  insert into public.event_pickups(event_id,rank,reason,is_active,updated_at)
  select
    ranked.id,
    row_number() over(order by ranked.score desc,ranked.start_date,ranked.title)::integer,
    'popular_7d',
    true,
    now()
  from (
    select
      e.id,e.start_date,e.title,sum(m.count)::bigint as score
    from public.event_site_metrics_daily m
    join public.events e on e.slug=m.event_slug
    join public.regional_sources rs on rs.id=e.source_id
    where m.metric='event_view'
      and m.metric_date >= ((now() at time zone 'Asia/Tokyo')::date-6)
      and e.publication_status='published'
      and e.verification_status='verified'
      and e.event_status not in ('cancelled','postponed','sold_out','registration_closed')
      and e.end_date >= (now() at time zone 'Asia/Tokyo')::date
      and rs.is_active and rs.event_use_allowed
      and not exists(
        select 1 from public.event_pickups existing
        where existing.event_id=e.id and existing.reason='manual' and existing.is_active
      )
    group by e.id,e.start_date,e.title
    order by score desc,e.start_date,e.title
    limit v_limit
  ) ranked
  on conflict(event_id) do update set
    rank=excluded.rank,
    reason='popular_7d',
    is_active=true,
    updated_at=now();

  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke all on function public.service_refresh_machiibe_pickups(integer) from public, anon, authenticated;
grant execute on function public.service_refresh_machiibe_pickups(integer) to service_role;

create or replace function public.service_set_machiibe_pickup(
  p_event_id bigint,
  p_enabled boolean,
  p_rank integer default 50
)
returns boolean
language plpgsql
security definer
volatile
set search_path = public, pg_temp
as $$
begin
  if coalesce(p_enabled,false) then
    if not exists(
      select 1 from public.events e
      join public.regional_sources rs on rs.id=e.source_id
      where e.id=p_event_id
        and e.publication_status='published'
        and e.verification_status='verified'
        and e.event_status not in ('cancelled','postponed','sold_out','registration_closed')
        and rs.is_active and rs.event_use_allowed
    ) then
      raise exception 'event_not_public' using errcode='22023';
    end if;

    insert into public.event_pickups(event_id,rank,reason,is_active,updated_at)
    values(p_event_id,greatest(1,least(coalesce(p_rank,50),9999)),'manual',true,now())
    on conflict(event_id) do update set
      rank=excluded.rank,reason='manual',is_active=true,updated_at=now();
  else
    delete from public.event_pickups where event_id=p_event_id;
  end if;
  return true;
end;
$$;

revoke all on function public.service_set_machiibe_pickup(bigint,boolean,integer) from public, anon, authenticated;
grant execute on function public.service_set_machiibe_pickup(bigint,boolean,integer) to service_role;

create or replace function public.get_public_machiibe_pickups(p_limit integer default 6)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(public.get_public_event(x.slug) order by x.rank,x.start_date,x.title)
      filter(where public.get_public_event(x.slug) is not null),
    '[]'::jsonb
  )
  from (
    select p.rank,e.slug,e.start_date,e.title
    from public.event_pickups p
    join public.events e on e.id=p.event_id
    join public.regional_sources rs on rs.id=e.source_id
    where p.is_active
      and e.publication_status='published'
      and e.verification_status='verified'
      and e.event_status not in ('cancelled','postponed','sold_out','registration_closed')
      and e.end_date >= (now() at time zone 'Asia/Tokyo')::date
      and rs.is_active and rs.event_use_allowed
    order by p.rank,e.start_date,e.title
    limit least(greatest(coalesce(p_limit,6),1),12)
  ) x;
$$;

revoke all on function public.get_public_machiibe_pickups(integer) from public, anon, authenticated;
grant execute on function public.get_public_machiibe_pickups(integer) to anon, authenticated;

comment on table public.event_site_metrics_daily is 'まちイベの個人識別子を保存しない日次集計。server-side service_roleのみ加算。';
comment on table public.event_search_terms_daily is 'まちイベ検索語の日次集計。メール/長い数列等はAPI側で除外してから保存する。';
comment on table public.event_pickups is 'まちイベTOPのピックアップイベント。人気7日または管理者手動選択。';

commit;
