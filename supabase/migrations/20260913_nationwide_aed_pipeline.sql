begin;

-- 全国の自治体オープンデータを同じ表へ継続的に取り込むための来歴・品質列。
alter table public.safety_spots
  add column if not exists source_external_id text,
  add column if not exists prefecture_code text,
  add column if not exists installation_location text,
  add column if not exists availability text,
  add column if not exists source_updated_at timestamptz,
  add column if not exists imported_at timestamptz not null default now(),
  add column if not exists duplicate_candidate boolean not null default false,
  add column if not exists duplicate_group_key text,
  add column if not exists quality_status text not null default 'verified';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'safety_spots_quality_status_check'
  ) then
    alter table public.safety_spots add constraint safety_spots_quality_status_check
      check (quality_status in ('verified', 'rough', 'review'));
  end if;
end $$;

create index if not exists safety_spots_type_lat_lng_idx
  on public.safety_spots(facility_type, latitude, longitude) where active = true;
create index if not exists safety_spots_pref_city_type_idx
  on public.safety_spots(prefecture, municipality, facility_type) where active = true;
create index if not exists safety_spots_duplicate_candidate_idx
  on public.safety_spots(duplicate_group_key) where duplicate_candidate = true;

-- 戻り値を増やすため、既存シグネチャを明示的に置き換える。
drop function if exists public.get_safety_spots(
  double precision,double precision,double precision,double precision,text[],integer
);

create function public.get_safety_spots(
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
  source_updated_at timestamptz,
  source_license text,
  installation_location text,
  availability text,
  geocode_source text,
  quality_status text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    s.id, s.facility_type, s.name, s.prefecture, s.municipality, s.address,
    s.phone, s.parent_name, s.latitude, s.longitude, s.source_name,
    s.source_url, s.source_date, s.source_updated_at, s.source_license,
    s.installation_location, s.availability, s.geocode_source, s.quality_status
  from public.safety_spots s
  where s.active = true
    and s.duplicate_candidate = false
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

comment on column public.safety_spots.duplicate_candidate is
  '近接・名称類似などで同一施設の可能性があり、人または後続処理の確認が必要な行。公開RPCからは除外する。';
comment on column public.safety_spots.quality_status is
  'verified=個別確認済み、rough=全国一括取込、review=要確認。';

commit;
