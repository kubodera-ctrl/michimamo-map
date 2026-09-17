begin;

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.user_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

alter table public.user_presence enable row level security;
alter table public.user_activity_days enable row level security;
revoke all on table public.user_presence from anon, authenticated;
revoke all on table public.user_activity_days from anon, authenticated;

create or replace function public.touch_user_presence()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.user_presence(user_id, first_seen_at, last_seen_at)
  values (v_user_id, v_now, v_now)
  on conflict (user_id) do update
    set last_seen_at = excluded.last_seen_at;

  insert into public.user_activity_days(user_id, activity_date, first_seen_at, last_seen_at)
  values (v_user_id, v_today, v_now, v_now)
  on conflict (user_id, activity_date) do update
    set last_seen_at = excluded.last_seen_at;

  return jsonb_build_object('ok', true, 'at', v_now);
end;
$$;

revoke all on function public.touch_user_presence() from public, anon, authenticated;
grant execute on function public.touch_user_presence() to authenticated;

create or replace function public.admin_get_statistics(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
begin
  perform public.admin_validate(p_password);

  with region_source as (
    select case
      when nullif(trim(s.address), '') is null then '地域不明'
      when s.address ~ '^東京都[^0-9０-９、, ]+区'
        then substring(s.address from '^東京都[^0-9０-９、, ]+区')
      when s.address ~ '^(北海道|大阪府|京都府|.{2,3}県)[^0-9０-９、, ]+[市区町村]'
        then substring(s.address from '^((北海道|大阪府|京都府|.{2,3}県)[^0-9０-９、, ]+[市区町村])')
      else coalesce(nullif(split_part(trim(s.address), ' ', 1), ''), '地域不明')
    end as region,
    s.report_count, s.confirm_count, s.like_count
    from public.spots s
  ),
  region_stats as (
    select region, count(*)::integer as post_count,
      coalesce(sum(report_count), 0)::integer as report_count,
      coalesce(sum(confirm_count), 0)::integer as confirm_count,
      coalesce(sum(like_count), 0)::integer as like_count
    from region_source group by region
    order by post_count desc, region limit 12
  ),
  category_stats as (
    select s.category, count(*)::integer as post_count,
      coalesce(sum(s.report_count), 0)::integer as report_count,
      coalesce(sum(s.confirm_count), 0)::integer as confirm_count,
      coalesce(sum(s.like_count), 0)::integer as like_count
    from public.spots s group by s.category
    order by post_count desc, s.category
  ),
  days as (
    select generate_series(
      (v_today - 6)::timestamp,
      v_today::timestamp,
      interval '1 day'
    )::date as day
  ),
  daily_stats as (
    select d.day,
      count(s.id)::integer as post_count,
      count(distinct s.created_by)::integer as posting_users
    from days d
    left join public.spots s
      on (s.created_at at time zone 'Asia/Tokyo')::date = d.day
    group by d.day order by d.day
  ),
  recent_users as (
    select up.user_id,
      coalesce(
        (select nullif(trim(p.name), '')
         from public.profiles p
         where p.auth_id = up.user_id or p.id = up.user_id
         order by (p.auth_id = up.user_id) desc
         limit 1),
        'ユーザー'
      ) as name,
      up.last_seen_at,
      (up.last_seen_at >= now() - interval '2 minutes') as online
    from public.user_presence up
    order by up.last_seen_at desc
    limit 10
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'lineUsers', (
        select count(distinct p.auth_id)
        from public.profiles p
        join auth.users u on u.id = p.auth_id
        where p.linked_at is not null and p.auth_id is not null
      ),
      'profiles', (select count(*) from public.profiles),
      'posts', (select count(*) from public.spots),
      'postsToday', (select count(*) from public.spots where (created_at at time zone 'Asia/Tokyo')::date = v_today),
      'posts7d', (select count(*) from public.spots where created_at >= now() - interval '7 days'),
      'hiddenPosts', (select count(*) from public.spots where is_hidden),
      'reports', (select coalesce(sum(report_count), 0) from public.spots),
      'confirms', (select coalesce(sum(confirm_count), 0) from public.spots),
      'likes', (select coalesce(sum(like_count), 0) from public.spots),
      'todayUsers', (select count(*) from public.user_activity_days where activity_date = v_today),
      'activeUsers7d', (select count(distinct user_id) from public.user_activity_days where activity_date >= v_today - 6),
      'onlineUsers', (select count(*) from public.user_presence where last_seen_at >= now() - interval '2 minutes'),
      'latestSeenAt', (select max(last_seen_at) from public.user_presence),
      'newUsers7d', (select count(*) from auth.users where created_at >= now() - interval '7 days')
    ),
    'recentUsers', coalesce((select jsonb_agg(to_jsonb(r) order by r.last_seen_at desc) from recent_users r), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(to_jsonb(r) order by r.post_count desc, r.region) from region_stats r), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.post_count desc, c.category) from category_stats c), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily_stats d), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_statistics(text) from public, anon, authenticated;
grant execute on function public.admin_get_statistics(text) to authenticated;

commit;
