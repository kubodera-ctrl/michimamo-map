-- Machimamo Events: family dining overlay foundation.
-- This does not select or ingest a restaurant provider. It stores only verified supplemental facts
-- whose source/permission has been reviewed.
begin;

create table if not exists public.dining_family_profiles (
  id bigint generated always as identity primary key,
  identity_key text not null unique,
  external_provider text,
  external_place_id text,
  name text not null,
  prefecture text,
  municipality text,
  address text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  official_url text,
  source_url text not null,
  source_kind text not null default 'official'
    check (source_kind in ('official','restaurant_submission','partner','licensed_api','manual_verified')),
  child_friendly boolean,
  kids_menu boolean,
  high_chair boolean,
  stroller_ok boolean,
  baby_food_allowed boolean,
  private_room boolean,
  non_smoking boolean,
  parking boolean,
  barrier_free boolean,
  accessibility_keys text[] not null default '{}',
  verification_status text not null default 'needs_review'
    check (verification_status in ('needs_review','verified','stale','hidden')),
  last_verified_at timestamptz,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null))
);

create table if not exists public.dining_child_price_rules (
  id bigint generated always as identity primary key,
  profile_id bigint not null references public.dining_family_profiles(id) on delete cascade,
  age_group text not null
    check (age_group in ('age_0_2','preschool','elementary','junior_high','other')),
  meal_period text not null default 'all'
    check (meal_period in ('all','breakfast','lunch','dinner','buffet','tea','other')),
  rule_type text not null
    check (rule_type in ('free','half','percent_discount','fixed_price','child_price','other')),
  percent_off numeric(5,2) check (percent_off is null or (percent_off >= 0 and percent_off <= 100)),
  fixed_price_yen integer check (fixed_price_yen is null or fixed_price_yen >= 0),
  condition_text text,
  valid_from date,
  valid_until date,
  source_url text not null,
  last_verified_at timestamptz not null,
  verification_status text not null default 'verified'
    check (verification_status in ('verified','stale','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dining_family_profiles_location_idx
  on public.dining_family_profiles(latitude, longitude)
  where verification_status = 'verified';

create index if not exists dining_family_profiles_accessibility_gin_idx
  on public.dining_family_profiles using gin(accessibility_keys);

create index if not exists dining_child_price_rules_search_idx
  on public.dining_child_price_rules(age_group, rule_type, meal_period, verification_status);

alter table public.dining_family_profiles enable row level security;
alter table public.dining_child_price_rules enable row level security;

revoke all on table public.dining_family_profiles from anon, authenticated;
revoke all on table public.dining_child_price_rules from anon, authenticated;

create or replace function public.get_verified_family_dining_overlays(
  p_place_keys text[] default null,
  p_preschool_price text default null,
  p_elementary_price text default null,
  p_accessibility_keys text[] default null,
  p_limit integer default 100
)
returns table(
  identity_key text,
  name text,
  prefecture text,
  municipality text,
  address text,
  latitude double precision,
  longitude double precision,
  official_url text,
  child_friendly boolean,
  kids_menu boolean,
  high_chair boolean,
  stroller_ok boolean,
  baby_food_allowed boolean,
  private_room boolean,
  non_smoking boolean,
  parking boolean,
  barrier_free boolean,
  accessibility_keys text[],
  child_price_rules jsonb,
  source_url text,
  last_verified_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.identity_key,
    p.name,
    p.prefecture,
    p.municipality,
    p.address,
    p.latitude,
    p.longitude,
    p.official_url,
    p.child_friendly,
    p.kids_menu,
    p.high_chair,
    p.stroller_ok,
    p.baby_food_allowed,
    p.private_room,
    p.non_smoking,
    p.parking,
    p.barrier_free,
    p.accessibility_keys,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'age_group', r.age_group,
          'meal_period', r.meal_period,
          'rule_type', r.rule_type,
          'percent_off', r.percent_off,
          'fixed_price_yen', r.fixed_price_yen,
          'condition_text', r.condition_text,
          'source_url', r.source_url,
          'last_verified_at', r.last_verified_at
        )
        order by r.age_group, r.meal_period, r.id
      )
      from public.dining_child_price_rules r
      where r.profile_id = p.id
        and r.verification_status = 'verified'
        and (r.valid_from is null or r.valid_from <= current_date)
        and (r.valid_until is null or r.valid_until >= current_date)
    ), '[]'::jsonb) as child_price_rules,
    p.source_url,
    p.last_verified_at
  from public.dining_family_profiles p
  where p.verification_status = 'verified'
    and (p.valid_until is null or p.valid_until >= current_date)
    and (p_place_keys is null or cardinality(p_place_keys) = 0 or p.identity_key = any(p_place_keys))
    and (
      p_preschool_price is null
      or exists (
        select 1 from public.dining_child_price_rules r
        where r.profile_id = p.id
          and r.age_group = 'preschool'
          and r.verification_status = 'verified'
          and (
            (p_preschool_price = 'free' and r.rule_type = 'free')
            or (p_preschool_price = 'half' and (r.rule_type = 'half' or (r.rule_type = 'percent_discount' and coalesce(r.percent_off,0) >= 50)))
            or (p_preschool_price = 'child_price' and r.rule_type in ('fixed_price','child_price','half','percent_discount','free'))
          )
          and (r.valid_from is null or r.valid_from <= current_date)
          and (r.valid_until is null or r.valid_until >= current_date)
      )
    )
    and (
      p_elementary_price is null
      or exists (
        select 1 from public.dining_child_price_rules r
        where r.profile_id = p.id
          and r.age_group = 'elementary'
          and r.verification_status = 'verified'
          and (
            (p_elementary_price = 'free' and r.rule_type = 'free')
            or (p_elementary_price = 'half' and (r.rule_type = 'half' or (r.rule_type = 'percent_discount' and coalesce(r.percent_off,0) >= 50)))
            or (p_elementary_price = 'child_price' and r.rule_type in ('fixed_price','child_price','half','percent_discount','free'))
          )
          and (r.valid_from is null or r.valid_from <= current_date)
          and (r.valid_until is null or r.valid_until >= current_date)
      )
    )
    and (
      p_accessibility_keys is null or cardinality(p_accessibility_keys) = 0
      or p.accessibility_keys @> p_accessibility_keys
    )
  order by p.last_verified_at desc nulls last, p.name
  limit least(greatest(coalesce(p_limit,100),1),200);
$$;

revoke all on function public.get_verified_family_dining_overlays(text[],text,text,text[],integer)
  from public, anon, authenticated;
grant execute on function public.get_verified_family_dining_overlays(text[],text,text,text[],integer)
  to anon, authenticated;

comment on table public.dining_family_profiles is
  '外部店舗検索に重ねる、確認済みの子連れ・アクセシビリティ補助情報。一般店舗DBの代替ではない。';
comment on table public.dining_child_price_rules is
  '年齢・食事区分・割引条件・有効期間・出典を持つ子ども料金ルール。未就学無料/半額等を検索可能にする。';

commit;
