-- One-time guarded publication of reviewed Niigata City and nine Miyagi municipalities.
do $publish$
declare inserted_count integer;
begin
  lock table public.safety_spots in share row exclusive mode;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 33412 then
    raise exception 'Production baseline changed; reconcile again';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage
      where split_part(source_key,':',2) in (
        'f2b59eb7174246bd','d48629334c30345f','8e12e4949161e77f','60b52a89a32701de',
        '916e55078abf495d','54ba93b94ad6ca80','283d3b6a70db9cb4','a8cec1b000ddc96c',
        '01ce52f0d54ac4cf','2c32fa35cc8ea23b'
      ) and not duplicate_candidate) <> 1130 then
    raise exception 'Reviewed batch changed';
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
  where split_part(source_key,':',2) in (
    'f2b59eb7174246bd','d48629334c30345f','8e12e4949161e77f','60b52a89a32701de',
    '916e55078abf495d','54ba93b94ad6ca80','283d3b6a70db9cb4','a8cec1b000ddc96c',
    '01ce52f0d54ac4cf','2c32fa35cc8ea23b'
  ) and not duplicate_candidate and not active
  on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 1130 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
end;
$publish$;
