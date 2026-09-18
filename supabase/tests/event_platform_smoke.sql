begin;

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,event_use_allowed,image_policy,is_active
) values (
  'ci-official','CI Official','manual','https://example.test/source',true,'not_used',true
);

insert into public.events(
  slug,title,start_date,end_date,schedule_type,prefecture,official_url,
  price_type,is_free,source_id,source_page_url,
  verification_status,publication_status,image_url,image_usage_status,
  location_precision,location_verified,dedupe_key
) values
(
  'ci-free-today','CI Free Today',current_date,current_date,'single','東京都','https://example.test/free',
  'free',true,(select id from public.regional_sources where source_key='ci-official'),'https://example.test/free',
  'verified','published','https://example.test/image.jpg','not_used',
  'exact_address',true,'ci-free-today'
),
(
  'ci-recurring','CI Recurring',current_date,current_date+30,'recurring','東京都','https://example.test/recurring',
  'paid',false,(select id from public.regional_sources where source_key='ci-official'),'https://example.test/recurring',
  'verified','published',null,'not_used',
  'unknown',false,'ci-recurring'
),
(
  'ci-unverified','CI Unverified',current_date,current_date,'single','東京都','https://example.test/unverified',
  'free',true,(select id from public.regional_sources where source_key='ci-official'),'https://example.test/unverified',
  'unverified','published',null,'not_used',
  'unknown',false,'ci-unverified'
);

insert into public.event_occurrences(event_id,occurrence_date,status)
select id,current_date+2,'scheduled' from public.events where slug='ci-recurring';

insert into public.fandom_entities(slug,display_name,aliases,entity_type)
values('ci-oshi','CI Oshi',array['CI推し'],'other');

insert into public.event_fandom_links(event_id,fandom_id,relation_type,verification_status,source_url,last_verified_at)
select e.id,f.id,'official_event','verified','https://example.test/oshi',now()
from public.events e cross join public.fandom_entities f
where e.slug='ci-free-today' and f.slug='ci-oshi';

do $$
declare
  n integer;
  payload jsonb;
begin
  if has_table_privilege('anon','public.events','select') then
    raise exception 'anon must not select events directly';
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>current_date,
    p_end_date=>current_date,
    p_price_types=>array['free']
  );
  if n <> 1 then
    raise exception 'free public search expected 1, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>current_date,
    p_end_date=>current_date,
    p_keyword=>'CI Recurring'
  );
  if n <> 0 then
    raise exception 'recurring event must not match a non-occurrence day';
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>current_date+2,
    p_end_date=>current_date+2,
    p_keyword=>'CI Recurring'
  );
  if n <> 1 then
    raise exception 'recurring event must match exact occurrence day';
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>current_date,
    p_end_date=>current_date,
    p_fandom_slugs=>array['ci-oshi']
  );
  if n <> 1 then
    raise exception 'verified fandom filter expected 1, got %',n;
  end if;

  select public.get_public_event('ci-free-today') into payload;
  if payload is null then
    raise exception 'public event lookup returned null';
  end if;
  if payload->'image_url' <> 'null'::jsonb then
    raise exception 'unlicensed image leaked through public RPC';
  end if;

  if jsonb_array_length(public.get_public_event('ci-recurring')->'occurrences') <> 1 then
    raise exception 'recurring occurrence list missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='events_dedupe_key_unique_idx'
  ) then
    raise exception 'dedupe unique index missing';
  end if;
end;
$$;

insert into auth.users(id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
insert into public.profiles(auth_id) values
  ('00000000-0000-0000-0000-000000000001');

select public.service_record_machiibe_metric('page_view',null,null);
select public.service_record_machiibe_metric('search',null,'花火');
select public.service_record_machiibe_metric('event_view','ci-free-today',null);
select public.service_record_machiibe_metric('event_view','ci-free-today',null);

do $smoke$
declare
  payload jsonb;
  n integer;
begin
  select public.service_get_machiibe_admin_dashboard(30) into payload;
  if coalesce((payload->'summary'->>'pv')::integer,0) <> 1 then
    raise exception 'admin dashboard PV aggregate failed';
  end if;
  if coalesce((payload->'summary'->>'searches')::integer,0) <> 1 then
    raise exception 'admin dashboard search aggregate failed';
  end if;
  if coalesce((payload->'summary'->>'lineAuthUsers')::integer,0) <> 2 then
    raise exception 'LINE auth count expected 2';
  end if;
  if coalesce((payload->'summary'->>'linkedProfiles')::integer,0) <> 1 then
    raise exception 'linked profile count expected 1';
  end if;
  if jsonb_array_length(payload->'searchTerms') <> 1 then
    raise exception 'search term ranking missing';
  end if;

  select public.service_refresh_machiibe_pickups(6) into n;
  if n <> 1 then
    raise exception 'popular pickup refresh expected 1, got %',n;
  end if;

  if jsonb_array_length(public.get_public_machiibe_pickups(6)) <> 1 then
    raise exception 'public pickup RPC expected 1 event';
  end if;
end;
$smoke$;

insert into public.dining_family_profiles(
  identity_key,name,prefecture,municipality,address,latitude,longitude,
  source_url,source_kind,child_friendly,kids_menu,high_chair,stroller_ok,
  verification_status,last_verified_at,valid_until
) values (
  'ci-dining','CI Family Dining','東京都','港区','テスト住所',35.63,139.77,
  'https://example.test/dining','official',true,true,true,true,
  'verified',now(),current_date+30
);

insert into public.dining_child_price_rules(
  profile_id,age_group,meal_period,rule_type,condition_text,
  source_url,last_verified_at,verification_status
)
select id,'preschool','all','free','CI条件','https://example.test/dining-price',now(),'verified'
from public.dining_family_profiles where identity_key='ci-dining';

do $$
declare n integer;
begin
  select count(*) into n
  from public.get_verified_family_dining_overlays(
    p_preschool_price=>'free',
    p_limit=>10
  );
  if n <> 1 then
    raise exception 'verified preschool-free dining overlay expected 1, got %',n;
  end if;
end;
$$;

rollback;
