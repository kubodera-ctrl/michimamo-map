-- Publish only the 2026-09-14 reconciled additions, never older unreviewed staging rows.
-- Baseline and batch guards make this a one-time, atomic publication.
do $publish$
declare inserted_count integer;
begin
  lock table public.safety_spots in share row exclusive mode;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 28553 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where source_key like 'bodik-reviewed:gap20260914:%') <> 3356 then
    raise exception 'Reviewed staging batch is incomplete or changed';
  end if;
  if exists (
    select 1 from public.safety_spots_nationwide_stage
    where source_key like 'bodik-reviewed:gap20260914:%'
      and (active or duplicate_candidate or facility_type <> 'aed'
           or source_url is null or source_license is null or name is null or address is null
           or latitude is null or longitude is null
           or not (latitude between 20 and 46 and longitude between 122 and 154))
  ) then raise exception 'Invalid row in reviewed staging batch'; end if;
  insert into public.safety_spots (
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,active,duplicate_candidate
  ) select
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,true,false
  from public.safety_spots_nationwide_stage
  where source_key like 'bodik-reviewed:gap20260914:%' and not active and not duplicate_candidate
  on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 3356 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(distinct prefecture) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 47 then
    raise exception '47-prefecture coverage check failed';
  end if;
end;
$publish$;
