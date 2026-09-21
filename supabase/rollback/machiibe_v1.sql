-- Roll back only Machi Ibe v1 database objects.
-- Existing Machimamo tables/functions are not touched.

begin;

drop function if exists public.get_public_machiibe_pickups(integer);
drop function if exists public.service_set_machiibe_pickup(bigint,boolean,integer);
drop function if exists public.service_refresh_machiibe_pickups(integer);
drop function if exists public.service_get_machiibe_admin_dashboard(integer);
drop function if exists public.service_record_machiibe_metric(text,text,text);

drop function if exists public.get_verified_family_dining_overlays(text[],text,text,text[],integer);

drop function if exists public.get_public_facet_sitemap(integer);
drop function if exists public.get_public_fandom_sitemap(integer);
drop function if exists public.get_public_event_sitemap(integer);
drop function if exists public.get_public_events_by_slugs(text[]);
drop function if exists public.get_public_event(text);
drop function if exists public.search_public_events(
  date,date,text,text,text[],text[],text[],text[],boolean,text[],text[],text[],
  text,text[],timestamptz,boolean,boolean,text,integer,integer
);

drop table if exists public.event_pickups cascade;
drop table if exists public.event_search_terms_daily cascade;
drop table if exists public.event_site_metrics_daily cascade;

drop table if exists public.dining_child_price_rules cascade;
drop table if exists public.dining_family_profiles cascade;

drop table if exists public.event_source_records cascade;
drop table if exists public.event_fandom_links cascade;
drop table if exists public.fandom_entities cascade;
drop table if exists public.event_occurrences cascade;
drop table if exists public.events cascade;
drop table if exists public.regional_sources cascade;

commit;
