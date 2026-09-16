-- Versioned public attribution endpoint; leaves older clients intact.
create or replace function app_private.get_safety_source_summary_v2(p_limit integer default 500, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
 with sources as materialized (
  select s.prefecture,s.facility_type,s.municipality,s.source_name,s.source_url,
         max(s.source_date) as source_date,s.source_license,count(*)::bigint as spot_count
  from public.safety_spots s
  where s.active = true and s.facility_type in ('aed','police_station','koban','chuzaisho')
  group by s.prefecture,s.facility_type,s.municipality,s.source_name,s.source_url,s.source_license
 ), page as (
  select * from sources
  order by prefecture nulls last,facility_type,municipality nulls last,
           source_name nulls last,source_url nulls last,source_license nulls last
  limit least(greatest(coalesce(p_limit,500),1),500)
  offset greatest(coalesce(p_offset,0),0)
 )
 select jsonb_build_object('total',(select count(*) from sources),
                          'items',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb));
$$;
revoke all on function app_private.get_safety_source_summary_v2(integer,integer) from public;
grant execute on function app_private.get_safety_source_summary_v2(integer,integer) to anon,authenticated,service_role;
create or replace function public.get_safety_source_summary_v2(p_limit integer default 500, p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path = '' as $$
 select app_private.get_safety_source_summary_v2(p_limit,p_offset);
$$;
revoke all on function public.get_safety_source_summary_v2(integer,integer) from public;
grant execute on function public.get_safety_source_summary_v2(integer,integer) to anon,authenticated,service_role;
comment on function public.get_safety_source_summary_v2(integer,integer) is 'Public active facility attribution only; deterministic bounded pages with total, including stored prefecture. No user data.';
