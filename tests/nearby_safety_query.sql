-- Read-only verification; no production records are modified.
begin;
do $$
declare t record; actual bigint[]; expected bigint[];
begin
 for t in select * from (values(35.627,139.775,'aed'),(35.627,139.775,'police'),
 (34.7025,135.4959,'aed'),(34.7025,135.4959,'police'),(35.662,138.568,'aed'),(43.062,141.354,'police')) as x(lat,lng,category) loop
  select array_agg(id order by distance_m,id) into actual from public.get_nearby_safety_spots(t.lat,t.lng,t.category,5000,20);
  -- Independent full-table spherical-cosine calculation, without viewport/prefilter or early limit.
  -- Explicit top 20 of the full table to detect prefilter omissions, not just sorting.
  select array_agg(id order by meters,id) into expected from (
   select id,6371008.8*acos(least(1.0,greatest(-1.0,
    sin(radians(t.lat))*sin(radians(latitude))+cos(radians(t.lat))*cos(radians(latitude))*cos(radians(longitude-t.lng))
   ))) as meters from public.safety_spots where active and not duplicate_candidate and quality_status='verified'
    and facility_type=any(case t.category when 'aed' then array['aed'] else array['police_station','koban','chuzaisho'] end)
   order by meters,id limit 20
  )x where meters<=5000;
  if actual is distinct from expected then raise exception 'nearest mismatch: %',t; end if;
 end loop;
end$$;
set local role anon;
do $$ begin
 perform * from public.get_nearby_safety_spots(35.627,139.775,'aed',5000,20);
 begin perform * from public.get_nearby_safety_spots('NaN'::float8,139,'aed',5000,20); raise exception 'NaN accepted'; exception when invalid_parameter_value then null; end;
 begin perform * from public.get_nearby_safety_spots(35,139,'aed',10001,20); raise exception 'oversized radius accepted'; exception when invalid_parameter_value then null; end;
 begin perform * from public.get_nearby_safety_spots(35,139,'aed',5000,21); raise exception 'oversized limit accepted'; exception when invalid_parameter_value then null; end;
 begin perform * from public.get_nearby_safety_spots(35,139,'kodomo_110',5000,20); raise exception 'unreleased category accepted'; exception when invalid_parameter_value then null; end;
end$$;
select 'PASS: 6 full-table nearest comparisons; anonymous access; invalid coordinate/radius/limit/type denied' as result;
rollback;
