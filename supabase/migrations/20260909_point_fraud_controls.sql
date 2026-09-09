begin;

-- 既存ポイントを保ったまま、以後の取引台帳との整合性を検証する基準額。
create table if not exists public.point_balance_baselines (
  user_id uuid primary key references auth.users(id) on delete cascade,
  baseline_amount bigint not null,
  recorded_at timestamptz not null default now()
);
alter table public.point_balance_baselines enable row level security;
revoke all on table public.point_balance_baselines from anon, authenticated;

insert into public.point_balance_baselines(user_id, baseline_amount)
select p.auth_id, coalesce(p.point, 0)::bigint - coalesce(sum(pt.amount), 0)::bigint
from public.profiles p
left join public.point_transactions pt on pt.user_id = p.auth_id
where p.auth_id is not null
group by p.auth_id, p.point
on conflict(user_id) do nothing;

create table if not exists public.point_fraud_alerts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_code text not null check (rule_code in ('balance_mismatch','post_daily_limit','quiz_daily_limit','like_velocity','rapid_earning')),
  severity text not null check (severity in ('medium','high','critical')),
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
alter table public.point_fraud_alerts enable row level security;
revoke all on table public.point_fraud_alerts from anon, authenticated;
create unique index if not exists point_fraud_alerts_one_open_rule
  on public.point_fraud_alerts(user_id, rule_code) where status = 'open';

create or replace function public.detect_point_anomalies(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance bigint;
  v_expected bigint;
  v_post_count integer;
  v_post_points bigint;
  v_quiz_count integer;
  v_quiz_points bigint;
  v_likes_10m integer;
  v_likes_24h integer;
  v_earned_1h bigint;
begin
  select coalesce(p.point, 0)::bigint,
         b.baseline_amount + coalesce((select sum(pt.amount) from public.point_transactions pt where pt.user_id = p_user_id), 0)::bigint
  into v_balance, v_expected
  from public.profiles p
  join public.point_balance_baselines b on b.user_id = p.auth_id
  where p.auth_id = p_user_id;

  if v_balance is distinct from v_expected then
    insert into public.point_fraud_alerts(user_id, rule_code, severity, evidence)
    values(p_user_id, 'balance_mismatch', 'critical', jsonb_build_object('balance', v_balance, 'expected', v_expected))
    on conflict(user_id, rule_code) where status = 'open'
    do update set severity = excluded.severity, evidence = excluded.evidence, detected_at = now();
  end if;

  select count(*), coalesce(sum(amount), 0) into v_post_count, v_post_points
  from public.point_transactions
  where user_id = p_user_id and reason = 'spot_post'
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');
  if v_post_count > 5 or v_post_points > 50 then
    insert into public.point_fraud_alerts(user_id, rule_code, severity, evidence)
    values(p_user_id, 'post_daily_limit', 'critical', jsonb_build_object('count', v_post_count, 'points', v_post_points))
    on conflict(user_id, rule_code) where status = 'open'
    do update set severity = excluded.severity, evidence = excluded.evidence, detected_at = now();
  end if;

  select count(*), coalesce(sum(amount), 0) into v_quiz_count, v_quiz_points
  from public.point_transactions
  where user_id = p_user_id and reason = 'quiz'
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');
  if v_quiz_count > 1 or v_quiz_points > 10 then
    insert into public.point_fraud_alerts(user_id, rule_code, severity, evidence)
    values(p_user_id, 'quiz_daily_limit', 'critical', jsonb_build_object('count', v_quiz_count, 'points', v_quiz_points))
    on conflict(user_id, rule_code) where status = 'open'
    do update set severity = excluded.severity, evidence = excluded.evidence, detected_at = now();
  end if;

  select count(*) filter(where created_at >= now() - interval '10 minutes'), count(*)
  into v_likes_10m, v_likes_24h
  from public.point_transactions
  where user_id = p_user_id and reason = 'spot_like' and created_at >= now() - interval '24 hours';
  if v_likes_10m >= 20 or v_likes_24h >= 100 then
    insert into public.point_fraud_alerts(user_id, rule_code, severity, evidence)
    values(p_user_id, 'like_velocity', 'high', jsonb_build_object('likes_10m', v_likes_10m, 'likes_24h', v_likes_24h))
    on conflict(user_id, rule_code) where status = 'open'
    do update set severity = excluded.severity, evidence = excluded.evidence, detected_at = now();
  end if;

  select coalesce(sum(amount), 0) into v_earned_1h
  from public.point_transactions
  where user_id = p_user_id and amount > 0 and reason not in ('gacha_prize','admin')
    and created_at >= now() - interval '1 hour';
  if v_earned_1h >= 150 then
    insert into public.point_fraud_alerts(user_id, rule_code, severity, evidence)
    values(p_user_id, 'rapid_earning', 'high', jsonb_build_object('earned_1h', v_earned_1h))
    on conflict(user_id, rule_code) where status = 'open'
    do update set severity = excluded.severity, evidence = excluded.evidence, detected_at = now();
  end if;
end;
$$;
revoke all on function public.detect_point_anomalies(uuid) from public, anon, authenticated;

-- 全ポイント変更は行ロック・残高不足確認・台帳記録を必須にする。
create or replace function public.apply_point_transaction(p_user_id uuid, p_amount integer, p_reason text, p_ref_key text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance integer;
begin
  if p_amount = 0 or nullif(trim(coalesce(p_ref_key, '')), '') is null then
    raise exception 'invalid_point_transaction' using errcode = '22023';
  end if;
  if p_reason <> 'admin' and not public.is_user_active(p_user_id) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  -- マイグレーション後に作成されたユーザーにも初回取引前の基準額を用意する。
  insert into public.point_balance_baselines(user_id, baseline_amount)
  select p.auth_id, coalesce(p.point, 0)::bigint - coalesce((
    select sum(pt.amount) from public.point_transactions pt where pt.user_id = p_user_id
  ), 0)::bigint
  from public.profiles p where p.auth_id = p_user_id
  on conflict(user_id) do nothing;

  select coalesce(point, 0) into v_balance
  from public.profiles where auth_id = p_user_id for update;
  if v_balance is null then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_balance + p_amount < 0 then raise exception 'insufficient_points' using errcode = '22003'; end if;

  insert into public.point_transactions(user_id, amount, reason, ref_key)
  values(p_user_id, p_amount, p_reason, p_ref_key);
  v_balance := v_balance + p_amount;
  update public.profiles set point = v_balance where auth_id = p_user_id;
  perform public.detect_point_anomalies(p_user_id);
  return v_balance;
end;
$$;
revoke all on function public.apply_point_transaction(uuid,integer,text,text) from public, anon, authenticated;

create or replace function public.admin_adjust_points(p_password text, p_user_id uuid, p_amount integer, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance integer;
  v_ref text := 'admin:' || gen_random_uuid()::text;
begin
  perform public.admin_validate(p_password);
  if p_amount = 0 or abs(p_amount::bigint) > 100000 then raise exception 'invalid_adjustment_amount' using errcode = '22023'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 or length(trim(p_reason)) > 200 then
    raise exception 'adjustment_reason_required' using errcode = '22023';
  end if;
  v_balance := public.apply_point_transaction(p_user_id, p_amount, 'admin', v_ref);
  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values('point_adjustment', 'user', p_user_id::text,
         jsonb_build_object('amount', p_amount, 'reason', trim(p_reason), 'balance', v_balance, 'ref_key', v_ref), auth.uid());
  return v_balance;
end;
$$;

create or replace function public.admin_update_point_alert(p_password text, p_alert_id bigint, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user_id uuid;
begin
  perform public.admin_validate(p_password);
  if p_status not in ('reviewed','dismissed') then raise exception 'invalid_alert_status' using errcode = '22023'; end if;
  update public.point_fraud_alerts
  set status = p_status, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_alert_id and status = 'open'
  returning user_id into v_user_id;
  if v_user_id is null then raise exception 'alert_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values('point_alert_' || p_status, 'point_alert', p_alert_id::text,
         jsonb_build_object('user_id', v_user_id), auth.uid());
  return true;
end;
$$;

create or replace function public.admin_get_dashboard(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  perform public.admin_validate(p_password);
  select jsonb_build_object(
    'deletions', coalesce((select jsonb_agg(to_jsonb(x) order by x.requested_at desc) from (
      select adr.id, adr.user_id, p.name, adr.reason, adr.status, adr.requested_at
      from public.account_deletion_requests adr left join public.profiles p on p.auth_id = adr.user_id
      order by adr.requested_at desc limit 50
    ) x), '[]'::jsonb),
    'reportedSpots', coalesce((select jsonb_agg(to_jsonb(x) order by x.report_count desc, x.created_at desc) from (
      select s.id, s.title, s.address, s.category, s.report_count, s.is_hidden, s.created_by, p.name, s.created_at
      from public.spots s left join public.profiles p on p.auth_id = s.created_by
      where coalesce(s.report_count, 0) > 0 order by s.report_count desc, s.created_at desc limit 50
    ) x), '[]'::jsonb),
    'pointAlerts', coalesce((select jsonb_agg(to_jsonb(x) order by x.detected_at desc) from (
      select a.id, a.user_id, p.name, p.point as balance, a.rule_code, a.severity, a.evidence, a.status, a.detected_at,
             coalesce(um.status, 'active') as user_status
      from public.point_fraud_alerts a
      left join public.profiles p on p.auth_id = a.user_id
      left join public.user_moderation um on um.user_id = a.user_id
      where a.status = 'open' order by a.detected_at desc limit 50
    ) x), '[]'::jsonb),
    'pointTransactions', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select pt.id, pt.user_id, p.name, pt.amount, pt.reason, pt.ref_key, pt.created_at
      from public.point_transactions pt left join public.profiles p on p.auth_id = pt.user_id
      order by pt.created_at desc limit 100
    ) x), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select a.id, a.action, a.target_type, a.target_id, a.detail, a.actor_user_id, a.created_at
      from public.admin_audit_log a order by a.created_at desc limit 50
    ) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.admin_adjust_points(text,uuid,integer,text) from public, anon, authenticated;
revoke all on function public.admin_update_point_alert(text,bigint,text) from public, anon, authenticated;
revoke all on function public.admin_get_dashboard(text) from public, anon, authenticated;
grant execute on function public.admin_adjust_points(text,uuid,integer,text) to authenticated;
grant execute on function public.admin_update_point_alert(text,bigint,text) to authenticated;
grant execute on function public.admin_get_dashboard(text) to authenticated;

-- 既存ユーザーにも現在時点のルールを一度適用する。
do $$
declare r record;
begin
  for r in select user_id from public.point_balance_baselines loop
    perform public.detect_point_anomalies(r.user_id);
  end loop;
end;
$$;

commit;
