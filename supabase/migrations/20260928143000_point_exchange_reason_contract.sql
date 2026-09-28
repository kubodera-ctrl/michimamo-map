-- Beta hardening: make the existing point-exchange issued path compatible with
-- the central point ledger, and expose an authenticated gross/reserved/available projection.
-- Additive only. This file is NOT applied to Production by this branch.

begin;

alter table public.point_transactions
  drop constraint if exists point_transactions_reason_check;

alter table public.point_transactions
  add constraint point_transactions_reason_check
  check (reason in (
    'spot_post',
    'spot_like',
    'quiz',
    'gacha_cost',
    'gacha_prize',
    'admin',
    'aed_new_approval',
    'weekly_quiz_stamp_reward',
    'aed_stamp_reward',
    'point_exchange'
  ));

comment on constraint point_transactions_reason_check on public.point_transactions is
  'Active/legacy-compatible ledger reasons. Future reasons such as point_exchange_reversal, asp_reward, asp_reward_reversal, and vehicle_reward require separate approved additive migrations before use.';

create or replace function public.get_my_point_balance()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_gross bigint;
  v_reserved bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode='28000';
  end if;

  select coalesce(point,0)::bigint
    into v_gross
  from public.profiles
  where auth_id=v_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode='P0002';
  end if;

  select coalesce(sum(points),0)::bigint
    into v_reserved
  from public.point_exchange_requests
  where user_id=v_user_id
    and status in ('requested','points_reserved','approved','issuing');

  return jsonb_build_object(
    'gross',v_gross,
    'reserved',v_reserved,
    'available',greatest(0::bigint,v_gross-v_reserved)
  );
end;
$$;

revoke all on function public.get_my_point_balance() from public, anon;
grant execute on function public.get_my_point_balance() to authenticated;

commit;
