begin;

create table if not exists public.account_deletion_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_deletion_requests_one_active
on public.account_deletion_requests (user_id)
where status in ('pending', 'processing');

alter table public.account_deletion_requests enable row level security;
revoke all on table public.account_deletion_requests from anon, authenticated;

create or replace function public.get_my_dashboard()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with me as (
    select auth.uid() as uid
  ), today_start as (
    select (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo') as ts
  )
  select jsonb_build_object(
    'today', jsonb_build_object(
      'earned', coalesce((select sum(pt.amount) from public.point_transactions pt, me, today_start where pt.user_id = me.uid and pt.amount > 0 and pt.created_at >= today_start.ts), 0),
      'postCount', coalesce((select count(*) from public.point_transactions pt, me, today_start where pt.user_id = me.uid and pt.reason = 'spot_post' and pt.created_at >= today_start.ts), 0),
      'quizClaimed', exists(select 1 from public.quiz_claims qc, me where qc.user_id = me.uid and qc.claim_date = (timezone('Asia/Tokyo', now()))::date),
      'quizScore', coalesce((select qc.score from public.quiz_claims qc, me where qc.user_id = me.uid and qc.claim_date = (timezone('Asia/Tokyo', now()))::date), 0)
    ),
    'points', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select pt.id, pt.amount, pt.reason, pt.created_at from public.point_transactions pt, me where pt.user_id = me.uid order by pt.created_at desc limit 30
    ) x), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select s.id, s.title, s.category, s.address, s.like_count, s.report_count, s.created_at from public.spots s, me where s.created_by = me.uid order by s.created_at desc limit 20
    ) x), '[]'::jsonb),
    'gacha', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select g.id, g.prize_rank, g.prize_points, g.created_at from public.gacha_results g, me where g.user_id = me.uid order by g.created_at desc limit 20
    ) x), '[]'::jsonb),
    'deletionStatus', (select adr.status from public.account_deletion_requests adr, me where adr.user_id = me.uid and adr.status in ('pending', 'processing') order by adr.requested_at desc limit 1)
  ) from me;
$$;

create or replace function public.request_account_deletion(p_reason text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if exists (select 1 from public.account_deletion_requests where user_id = v_user_id and status in ('pending', 'processing')) then
    return 'already_requested';
  end if;

  insert into public.account_deletion_requests (user_id, reason)
  values (v_user_id, nullif(left(trim(coalesce(p_reason, '')), 500), ''));
  return 'requested';
end;
$$;

revoke all on function public.get_my_dashboard() from public;
revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.get_my_dashboard() to authenticated;
grant execute on function public.request_account_deletion(text) to authenticated;

commit;
