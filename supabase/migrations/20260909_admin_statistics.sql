begin;

-- 管理画面専用の統計。admin_validate により、ログイン中の管理者＋管理パスワードで保護する。
create or replace function public.admin_get_statistics(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  perform public.admin_validate(p_password);

  with region_source as (
    select case
      when nullif(trim(s.address), '') is null then '地域不明'
      when s.address ~ '^東京都[^0-9０-９、, ]+区'
        then substring(s.address from '^東京都[^0-9０-９、, ]+区')
      when s.address ~ '^(北海道|大阪府|京都府|.{2,3}県)[^0-9０-９、, ]+[市区町村]'
        then substring(s.address from '^(北海道|大阪府|京都府|.{2,3}県)[^0-9０-９、, ]+[市区町村]')
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
      (current_date - 6)::timestamp,
      current_date::timestamp,
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
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'users', (select count(*) from auth.users),
      -- 現在の登録導線はLINEのみ。LINE連携用メール交換もauth上はemail providerになる。
      'lineUsers', (select count(*) from auth.users),
      'profiles', (select count(*) from public.profiles),
      'posts', (select count(*) from public.spots),
      'postsToday', (select count(*) from public.spots where (created_at at time zone 'Asia/Tokyo')::date = (now() at time zone 'Asia/Tokyo')::date),
      'posts7d', (select count(*) from public.spots where created_at >= now() - interval '7 days'),
      'hiddenPosts', (select count(*) from public.spots where is_hidden),
      'reports', (select coalesce(sum(report_count), 0) from public.spots),
      'confirms', (select coalesce(sum(confirm_count), 0) from public.spots),
      'likes', (select coalesce(sum(like_count), 0) from public.spots),
      'activeUsers7d', (select count(distinct user_id) from public.spot_votes where created_at >= now() - interval '7 days'),
      'newUsers7d', (select count(*) from auth.users where created_at >= now() - interval '7 days')
    ),
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
