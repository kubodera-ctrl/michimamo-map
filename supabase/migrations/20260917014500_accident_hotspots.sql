create table if not exists public.accident_hotspots (
  id bigint generated always as identity primary key,
  grid_x integer not null, grid_y integer not null,
  lat double precision not null check (lat between 20 and 50),
  lng double precision not null check (lng between 120 and 155),
  accident_count integer not null check (accident_count >= 5),
  death_count integer not null check (death_count >= 0),
  injury_count integer not null check (injury_count >= 0),
  first_year smallint not null, last_year smallint not null,
  cell_size_m smallint not null default 250 check (cell_size_m between 100 and 1000),
  updated_at timestamptz not null default now(), unique (grid_x,grid_y)
);
create index if not exists accident_hotspots_view_idx on public.accident_hotspots (lat,lng);
alter table public.accident_hotspots enable row level security;
drop policy if exists accident_hotspots_public_read on public.accident_hotspots;
create policy accident_hotspots_public_read on public.accident_hotspots for select to anon,authenticated using (true);
grant select on public.accident_hotspots to anon,authenticated;
create or replace function public.accident_hotspots_in_view(p_min_lat double precision,p_min_lng double precision,p_max_lat double precision,p_max_lng double precision,p_limit integer default 300)
returns table(id bigint,lat double precision,lng double precision,accident_count integer,death_count integer,injury_count integer,first_year smallint,last_year smallint,cell_size_m smallint)
language sql stable security invoker set search_path='' as $$
  select h.id,h.lat,h.lng,h.accident_count,h.death_count,h.injury_count,h.first_year,h.last_year,h.cell_size_m
  from public.accident_hotspots h
  where h.lat between least(p_min_lat,p_max_lat) and greatest(p_min_lat,p_max_lat)
    and h.lng between least(p_min_lng,p_max_lng) and greatest(p_min_lng,p_max_lng)
  order by (h.accident_count+h.death_count*5) desc,h.id
  limit least(greatest(coalesce(p_limit,300),1),300)
$$;
revoke all on function public.accident_hotspots_in_view(double precision,double precision,double precision,double precision,integer) from public;
grant execute on function public.accident_hotspots_in_view(double precision,double precision,double precision,double precision,integer) to anon,authenticated;
