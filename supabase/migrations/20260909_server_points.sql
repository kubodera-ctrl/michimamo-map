begin;

create table if not exists public.point_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('spot_post', 'spot_like', 'quiz', 'gacha_cost', 'gacha_prize', 'admin')),
  ref_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref_key)
);

alter table public.point_transactions enable row level security;
revoke all on table public.point_transactions from anon, authenticated;
grant select on table public.point_transactions to authenticated;

drop policy if exists point_transactions_owner_read on public.point_transactions;
create policy point_transactions_owner_read
on public.point_transactions for select
to authenticated
using (user_id = auth.uid());

create table if not exists public.quiz_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null default (timezone('Asia/Tokyo', now()))::date,
  score integer not null check (score between 0 and 10),
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

alter table public.quiz_claims enable row level security;
revoke all on table public.quiz_claims from anon, authenticated;

create table if not exists public.gacha_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prize_rank integer not null check (prize_rank between 1 and 4),
  prize_points integer not null check (prize_points >= 0),
  created_at timestamptz not null default now()
);

alter table public.gacha_results enable row level security;
revoke all on table public.gacha_results from anon, authenticated;
grant select on table public.gacha_results to authenticated;

drop policy if exists gacha_results_owner_read on public.gacha_results;
create policy gacha_results_owner_read
on public.gacha_results for select
to authenticated
using (user_id = auth.uid());

create or replace function public.apply_point_transaction(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_key text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_balance integer;
begin
  if p_amount = 0 or p_ref_key is null or p_ref_key = '' then
    raise exception 'invalid_point_transaction' using errcode = '22023';
  end if;

  insert into public.point_transactions (user_id, amount, reason, ref_key)
  values (p_user_id, p_amount, p_reason, p_ref_key);

  update public.profiles
  set point = greatest(0, coalesce(point, 0) + p_amount)
  where auth_id = p_user_id
  returning point into v_balance;

  if v_balance is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  return v_balance;
end;
$$;

revoke all on function public.apply_point_transaction(uuid, integer, text, text) from public;

create or replace function public.award_spot_post_points()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today_count integer;
begin
  select count(*) into v_today_count
  from public.point_transactions
  where user_id = new.created_by
    and reason = 'spot_post'
    and created_at >= (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo');

  if v_today_count < 5 then
    perform public.apply_point_transaction(new.created_by, 10, 'spot_post', new.id::text);
  end if;

  return new;
end;
$$;

drop trigger if exists spots_award_points on public.spots;
create trigger spots_award_points
after insert on public.spots
for each row
when (new.created_by is not null)
execute function public.award_spot_post_points();

create or replace function public.vote_spot(p_spot_id bigint, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
  v_owner_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_kind not in ('like', 'report', 'confirm') then
    raise exception 'invalid_vote_kind' using errcode = '22023';
  end if;

  select created_by into v_owner_id from public.spots where id = p_spot_id;
  if v_owner_id is null and not exists (select 1 from public.spots where id = p_spot_id) then
    raise exception 'spot_not_found' using errcode = 'P0002';
  end if;
  if p_kind = 'like' and v_owner_id = v_user_id then
    raise exception 'cannot_like_own_spot' using errcode = '22023';
  end if;

  insert into public.spot_votes (spot_id, user_id, kind)
  values (p_spot_id, v_user_id, p_kind)
  on conflict do nothing;
  if not found then
    raise exception 'already_voted' using errcode = '23505';
  end if;

  if p_kind = 'like' then
    update public.spots set like_count = coalesce(like_count, 0) + 1 where id = p_spot_id returning like_count into v_count;
    perform public.apply_point_transaction(v_user_id, 1, 'spot_like', p_spot_id::text);
  elsif p_kind = 'report' then
    update public.spots set report_count = coalesce(report_count, 0) + 1 where id = p_spot_id returning report_count into v_count;
  else
    update public.spots set confirm_count = coalesce(confirm_count, 0) + 1 where id = p_spot_id returning confirm_count into v_count;
  end if;

  return v_count;
end;
$$;

create or replace function public.claim_quiz_points(p_score integer)
returns table(awarded integer, balance integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_date date := (timezone('Asia/Tokyo', now()))::date;
  v_balance integer;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_score < 0 or p_score > 10 then raise exception 'invalid_quiz_score' using errcode = '22023'; end if;

  insert into public.quiz_claims (user_id, claim_date, score) values (v_user_id, v_date, p_score);
  if p_score > 0 then
    v_balance := public.apply_point_transaction(v_user_id, p_score, 'quiz', v_date::text);
  else
    select coalesce(point, 0) into v_balance from public.profiles where auth_id = v_user_id;
  end if;
  return query select p_score, v_balance;
exception when unique_violation then
  raise exception 'quiz_already_claimed_today' using errcode = '23505';
end;
$$;

create or replace function public.play_gacha()
returns table(prize_rank integer, prize_points integer, balance integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_roll double precision;
  v_rank integer;
  v_prize integer;
  v_result_id uuid := gen_random_uuid();
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  select coalesce(point, 0) into v_balance from public.profiles where auth_id = v_user_id for update;
  if v_balance is null then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_balance < 100 then raise exception 'insufficient_points' using errcode = '22003'; end if;

  v_balance := public.apply_point_transaction(v_user_id, -100, 'gacha_cost', v_result_id::text);
  v_roll := random();
  if v_roll < 0.00001 then v_rank := 1; v_prize := 100000;
  elsif v_roll < 0.00051 then v_rank := 2; v_prize := 10000;
  elsif v_roll < 0.10051 then v_rank := 3; v_prize := 50;
  else v_rank := 4; v_prize := 1;
  end if;

  insert into public.gacha_results (id, user_id, prize_rank, prize_points)
  values (v_result_id, v_user_id, v_rank, v_prize);
  v_balance := public.apply_point_transaction(v_user_id, v_prize, 'gacha_prize', v_result_id::text);
  return query select v_rank, v_prize, v_balance;
end;
$$;

revoke all on function public.claim_quiz_points(integer) from public;
revoke all on function public.play_gacha() from public;
grant execute on function public.claim_quiz_points(integer) to authenticated;
grant execute on function public.play_gacha() to authenticated;

commit;
