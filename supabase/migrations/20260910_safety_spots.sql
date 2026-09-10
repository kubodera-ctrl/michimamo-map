begin;

-- 公開データ由来の安全施設は、ユーザー投稿とは別テーブルで管理する。
-- 元データ・基準日・座標補完結果を残し、後から都道府県単位で更新可能にする。
create table if not exists public.safety_spots (
  id bigint generated always as identity primary key,
  source_key text not null unique,
  facility_type text not null
    check (facility_type in ('police_station', 'koban', 'chuzaisho', 'aed', 'kodomo_110')),
  name text not null,
  prefecture text not null,
  municipality text,
  address text not null,
  phone text,
  parent_name text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  source_name text not null default '警察庁 全国警察施設名称位置等',
  source_url text not null,
  source_date date,
  source_license text not null default 'CC BY',
  geocode_source text not null default '国土地理院 地名検索API',
  geocoded_title text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists safety_spots_prefecture_type_idx
  on public.safety_spots(prefecture, facility_type) where active = true;
create index if not exists safety_spots_latitude_idx
  on public.safety_spots(latitude) where active = true;
create index if not exists safety_spots_longitude_idx
  on public.safety_spots(longitude) where active = true;

alter table public.safety_spots enable row level security;
revoke all on table public.safety_spots from anon, authenticated;

create or replace function public.get_safety_spots(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_types text[] default array['police_station','koban','chuzaisho']::text[],
  p_max_rows integer default 1500
)
returns table(
  id bigint,
  facility_type text,
  name text,
  prefecture text,
  municipality text,
  address text,
  phone text,
  parent_name text,
  lat double precision,
  lng double precision,
  source_name text,
  source_url text,
  source_date date,
  geocode_source text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    s.id, s.facility_type, s.name, s.prefecture, s.municipality, s.address,
    s.phone, s.parent_name, s.latitude, s.longitude, s.source_name,
    s.source_url, s.source_date, s.geocode_source
  from public.safety_spots s
  where s.active = true
    and s.facility_type = any(coalesce(p_types, array['police_station','koban','chuzaisho']::text[]))
    and s.longitude between least(p_west, p_east) and greatest(p_west, p_east)
    and s.latitude between least(p_south, p_north) and greatest(p_south, p_north)
  order by
    case s.facility_type when 'police_station' then 1 when 'koban' then 2 when 'chuzaisho' then 3 else 4 end,
    s.name
  limit least(greatest(coalesce(p_max_rows, 1500), 1), 1500);
$$;

revoke all on function public.get_safety_spots(double precision,double precision,double precision,double precision,text[],integer)
  from public, anon, authenticated;
grant execute on function public.get_safety_spots(double precision,double precision,double precision,double precision,text[],integer)
  to anon, authenticated;

comment on table public.safety_spots is
  '公開データ由来の安全施設。ユーザー投稿と分離し、出典・基準日・座標補完元を保持する。';

commit;
