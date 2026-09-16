begin;
-- Public, read-only facility search. Does not store the search origin or expose submissions.
-- The table remains private; only this explicitly allowlisted projection is public.
grant usage on schema app_private to anon;
create function app_private.get_nearby_safety_spots(
 p_latitude double precision,p_longitude double precision,p_category text default 'aed',
 p_radius_m integer default 5000,p_limit integer default 20
) returns table(id bigint,facility_type text,name text,address text,phone text,
 lat double precision,lng double precision,distance_m double precision,
 installation_location text,availability text,source_name text,source_url text,
 source_date date,source_updated_at timestamptz,source_license text,geocode_source text)
language plpgsql stable security definer set search_path='' as $$
declare delta double precision; lat_delta double precision; lng_delta double precision; types text[];
begin
 if p_latitude is null or p_longitude is null or not (p_latitude between -90 and 90)
 or not (p_longitude between -180 and 180) then raise exception 'invalid_coordinates' using errcode='22023'; end if;
 if p_category is null or p_category not in ('aed','police') then raise exception 'invalid_category' using errcode='22023'; end if;
 if p_radius_m is null or p_radius_m not between 100 and 10000 or p_limit is null or p_limit not between 1 and 20 then
  raise exception 'invalid_search_bounds' using errcode='22023'; end if;
 types:=case p_category when 'aed' then array['aed'] else array['police_station','koban','chuzaisho'] end;
 delta:=p_radius_m/6371008.8; lat_delta:=degrees(delta)+0.00000001;
 lng_delta:=case when abs(p_latitude)+lat_delta>=90 then 180
  else degrees(asin(least(1.0,sin(delta)/cos(radians(p_latitude)))))+0.00000001 end;
 return query
 with candidates as (
  select s.*,6371008.8*2*asin(sqrt(least(1.0,greatest(0.0,
   power(sin(radians(s.latitude-p_latitude)/2),2)
   +cos(radians(p_latitude))*cos(radians(s.latitude))*power(sin(radians(s.longitude-p_longitude)/2),2)
  )))) as meters
  from public.safety_spots s
  where s.active and not s.duplicate_candidate and s.quality_status='verified'
   and s.facility_type=any(types)
   and s.latitude between greatest(-90,p_latitude-lat_delta) and least(90,p_latitude+lat_delta)
   and s.longitude between -180 and 180
   and (s.longitude between p_longitude-lng_delta and p_longitude+lng_delta
    or s.longitude<=p_longitude+lng_delta-360 or s.longitude>=p_longitude-lng_delta+360)
 )
 select s.id,s.facility_type,s.name,s.address,s.phone,s.latitude,s.longitude,s.meters,
 s.installation_location,s.availability,s.source_name,s.source_url,s.source_date,s.source_updated_at,s.source_license,s.geocode_source
 from candidates s where s.meters<=p_radius_m order by s.meters,s.id limit p_limit;
end$$;
create function public.get_nearby_safety_spots(
 p_latitude double precision,p_longitude double precision,p_category text default 'aed',
 p_radius_m integer default 5000,p_limit integer default 20
) returns table(id bigint,facility_type text,name text,address text,phone text,
 lat double precision,lng double precision,distance_m double precision,
 installation_location text,availability text,source_name text,source_url text,
 source_date date,source_updated_at timestamptz,source_license text,geocode_source text)
language sql stable security invoker set search_path='' as $$
 select * from app_private.get_nearby_safety_spots(p_latitude,p_longitude,p_category,p_radius_m,p_limit);
$$;
revoke all on function app_private.get_nearby_safety_spots(double precision,double precision,text,integer,integer),
 public.get_nearby_safety_spots(double precision,double precision,text,integer,integer) from public,anon,authenticated;
grant execute on function app_private.get_nearby_safety_spots(double precision,double precision,text,integer,integer),
 public.get_nearby_safety_spots(double precision,double precision,text,integer,integer) to anon,authenticated;
comment on function public.get_nearby_safety_spots(double precision,double precision,text,integer,integer)
 is 'Public verified facilities, nearest by spherical straight-line distance within 10km, at most 20. No location history stored.';
commit;
