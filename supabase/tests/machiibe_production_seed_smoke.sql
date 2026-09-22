\ir ../seeds/machiibe_initial_verified_events.sql
\ir ../seeds/machiibe_verified_events_batch2.sql
\ir ../seeds/machiibe_initial_verified_events.sql
\ir ../seeds/machiibe_verified_events_batch2.sql

do $$
declare
  n integer;
  payload jsonb;
begin
  select count(*) into n
  from public.events;
  if n <> 30 then
    raise exception 'production seed expected 30 events after double-run, got %',n;
  end if;

  select count(*) into n
  from public.event_occurrences eo
  join public.events e on e.id=eo.event_id
  where e.slug in (
    'water-kendama-20260921','water-clown-rio-20260922','water-seoppi-20260923',
    'miraikan-moon-2026','toyosu-kamimaro-202609','tdc-hybrid-training-2026'
  );
  if n <> 38 then
    raise exception 'production seed expected 38 occurrences after double-run, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-22',
    p_end_date=>'2026-09-23',
    p_keyword=>'東京都水の科学館'
  );
  if n <> 2 then
    raise exception 'production seed custom range expected 2 water museum events, got %',n;
  end if;

  select public.get_public_event('ariake-quizknock-nazotoki-2026') into payload;
  if payload is null or not (payload->'fandom_slugs' ? 'quizknock') then
    raise exception 'production seed QuizKnock relation missing';
  end if;

  if not (public.get_public_event('lalaport-jujutsu-5th-2026')->'fandom_slugs' ? 'jujutsu-kaisen')
     or not (public.get_public_event('tdc-toukenranbu-return-2026')->'fandom_slugs' ? 'touken-ranbu')
     or not (public.get_public_event('metsa-harvest-2026')->'fandom_slugs' ? 'moomin')
  then
    raise exception 'production seed additional fandom links missing';
  end if;

  if not (public.get_public_event('solamachi-space-brothers-2026')->'fandom_slugs' ? 'space-brothers')
     or not (public.get_public_event('joypolis-hololive-shiny-party')->'fandom_slugs' ? 'hololive')
     or not (public.get_public_event('tdc-drstone-tenq-2026')->'fandom_slugs' ? 'dr-stone')
     or not (public.get_public_event('lalaport-pokemon-height-2026')->'fandom_slugs' ? 'pokemon')
     or not (public.get_public_event('lalaterrace-sanrio-wagon-2026')->'fandom_slugs' ? 'sanrio')
     or not (public.get_public_event('lalaport-shinako-20260923')->'fandom_slugs' ? 'shinako')
     or not (public.get_public_event('sakuratown-kozame-2026')->'fandom_slugs' ? 'odekake-kozame')
     or not (public.get_public_event('sakuratown-galaxy999-2026')->'fandom_slugs' ? 'galaxy-express-999')
  then
    raise exception 'batch 2 fandom relations missing';
  end if;

  if exists(
    select 1 from public.events
    where image_usage_status <> 'not_used'
  ) then
    raise exception 'production seed must not publish images';
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-22',
    p_end_date=>'2026-10-31',
    p_venue_types=>array['mall'],
    p_venue_filter_active=>true
  );
  if n < 5 then
    raise exception 'mall venue filter returned too few seeded events: %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-22',
    p_end_date=>'2026-10-31',
    p_venue_types=>'{}'::text[],
    p_venue_filter_active=>true
  );
  if n <> 0 then
    raise exception 'active venue filter with no selections must return 0, got %',n;
  end if;

  if has_table_privilege('anon','public.events','select') then
    raise exception 'anon must not directly select public.events after production seed';
  end if;

  if exists(
    select 1 from public.events e
    join public.regional_sources rs on rs.id=e.source_id
    where e.publication_status='published'
      and (e.verification_status<>'verified' or not rs.event_use_allowed or rs.terms_review_status not in ('reviewed_facts_only','reviewed_allowed') or not rs.is_active)
  ) then
    raise exception 'published event violates publish gate';
  end if;
end;
$$;
