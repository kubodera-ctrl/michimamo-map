-- Isolated PostgreSQL fixture matching the Production contracts required by
-- the point-exchange migrations. Never run against Production.

create extension if not exists pgcrypto;

do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;

create schema if not exists auth;
create table auth.users(id uuid primary key);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.profiles(
  auth_id uuid primary key references auth.users(id),
  name text,
  point integer not null default 0
);

create table public.admin_audit_log(
  id bigint generated always as identity primary key,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail jsonb not null default '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

create or replace function public.admin_validate(p_password text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if p_password is distinct from 'test-admin' then
    raise exception 'invalid_admin_password' using errcode='42501';
  end if;
end $$;

create or replace function public.is_user_active(p_user_id uuid)
returns boolean language sql stable set search_path='' as $$
  select exists(select 1 from public.profiles p where p.auth_id=p_user_id)
$$;

create table public.point_transactions(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check(amount<>0),
  reason text not null,
  ref_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id,reason,ref_key),
  constraint point_transactions_reason_check check(reason in (
    'spot_post','spot_like','quiz','gacha_cost','gacha_prize','admin',
    'aed_new_approval','weekly_quiz_stamp_reward','aed_stamp_reward'
  ))
);

create or replace function public.apply_point_transaction(
  p_user_id uuid,p_amount integer,p_reason text,p_ref_key text
) returns integer
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_balance integer;
begin
  if p_amount=0 or nullif(trim(coalesce(p_ref_key,'')),'') is null then
    raise exception 'invalid_point_transaction' using errcode='22023';
  end if;
  select point into v_balance from public.profiles where auth_id=p_user_id for update;
  if not found then raise exception 'profile_not_found' using errcode='P0002'; end if;
  if v_balance+p_amount<0 then raise exception 'insufficient_points' using errcode='22003'; end if;
  insert into public.point_transactions(user_id,amount,reason,ref_key)
  values(p_user_id,p_amount,p_reason,p_ref_key);
  v_balance:=v_balance+p_amount;
  update public.profiles set point=v_balance where auth_id=p_user_id;
  return v_balance;
end $$;

revoke all on function public.apply_point_transaction(uuid,integer,text,text) from public,anon,authenticated;
