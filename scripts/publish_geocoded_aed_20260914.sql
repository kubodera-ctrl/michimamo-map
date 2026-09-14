-- One-time publication guard for the reviewed address-level geocoding batch.
do $publish$
declare inserted_count integer;
begin
  lock table public.safety_spots in share row exclusive mode;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 31909 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where source_key like 'bodik-reviewed:geocoded20260914:%') <> 674 then
    raise exception 'Reviewed geocoding batch changed';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where source_key like 'bodik-reviewed:geocoded20260914:%' and duplicate_candidate) <> 1 then
    raise exception 'Near-duplicate review result changed';
  end if;
  insert into public.safety_spots (
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,active,duplicate_candidate
  ) select
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,true,false
  from public.safety_spots_nationwide_stage
  where source_key like 'bodik-reviewed:geocoded20260914:%' and not duplicate_candidate and not active
  on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 673 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
end;
$publish$;
