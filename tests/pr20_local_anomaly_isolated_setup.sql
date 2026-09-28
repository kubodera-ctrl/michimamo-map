-- Disposable PostgreSQL fixture for PR #20 local-anomaly write behavior.
create extension if not exists pgcrypto;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema if not exists auth;
create schema if not exists app_private;
create schema if not exists storage;

create table auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;

create table public.profiles(
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id),
  name text,
  point integer not null default 0
);
create or replace function public.is_user_active(p_user_id uuid)
returns boolean language sql stable set search_path=''
as $$ select exists(select 1 from public.profiles p where p.auth_id=p_user_id) $$;

create table public.spots(
  id bigint generated always as identity primary key,
  lat double precision not null,
  lng double precision not null,
  category text not null,
  title text not null,
  comment text,
  image_url text,
  address text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table storage.objects(
  bucket_id text not null,
  name text not null,
  primary key(bucket_id,name)
);

create table public.point_transactions(
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id),
  amount integer not null check(amount<>0),
  reason text not null check(reason in (
    'spot_post','spot_like','quiz','gacha_cost','gacha_prize','admin',
    'aed_new_approval','weekly_quiz_stamp_reward','aed_stamp_reward'
  )),
  ref_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id,reason,ref_key)
);
create or replace function public.apply_point_transaction(
  p_user_id uuid,p_amount integer,p_reason text,p_ref_key text
) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v integer;
begin
  select point into v from public.profiles where auth_id=p_user_id for update;
  if not found then raise exception 'profile_not_found'; end if;
  if v+p_amount<0 then raise exception 'insufficient_points'; end if;
  insert into public.point_transactions(user_id,amount,reason,ref_key)
  values(p_user_id,p_amount,p_reason,p_ref_key);
  v:=v+p_amount;
  update public.profiles set point=v where auth_id=p_user_id;
  return v;
end $$;

create or replace function public.award_spot_post_points()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text,2202));
  select count(*) into n from public.point_transactions
   where user_id=new.created_by and reason='spot_post'
     and created_at>=date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
  if n<5 then perform public.apply_point_transaction(new.created_by,1,'spot_post',new.id::text); end if;
  return new;
end $$;
create trigger spots_award_points after insert on public.spots
for each row when(new.created_by is not null) execute function public.award_spot_post_points();

create table app_private.spot_submission_receipts(
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null,
  spot_id bigint not null references public.spots(id) on delete cascade,
  awarded integer not null default 0,
  created_at timestamptz not null default now(),
  primary key(user_id,request_id)
);

create or replace function public.delete_my_spot(p_spot_id bigint)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='28000';
  end if;
  delete from public.spots where id=p_spot_id and created_by=auth.uid();
  return found;
end $$;
