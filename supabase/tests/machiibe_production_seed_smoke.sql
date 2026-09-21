\ir ../seeds/machiibe_initial_verified_events.sql
\ir ../seeds/machiibe_initial_verified_events.sql

do $$
declare
  n integer;
  payload jsonb;
begin
  select count(*) into n
  from public.events
  where slug in (
    'water-kendama-20260921','water-clown-rio-20260922','water-seoppi-20260923',
    'miraikan-moon-2026','city-circuit-kart-ev-20260923','littleplanet-halloween-divercity-2026',
    'ariake-quizknock-nazotoki-2026','joypolis-sidem-3-2026','toyosu-kamimaro-202609','dainankyoku-2026'
  );
  if n <> 10 then
    raise exception 'production seed expected 10 events after double-run, got %',n;
  end if;

  select count(*) into n
  from public.event_occurrences eo
  join public.events e on e.id=eo.event_id
  where e.slug in (
    'water-kendama-20260921','water-clown-rio-20260922','water-seoppi-20260923',
    'miraikan-moon-2026','toyosu-kamimaro-202609'
  );
  if n <> 32 then
    raise exception 'production seed expected 32 occurrences after double-run, got %',n;
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

  if exists(
    select 1 from public.events
    where slug in (
      'water-kendama-20260921','water-clown-rio-20260922','water-seoppi-20260923',
      'miraikan-moon-2026','city-circuit-kart-ev-20260923','littleplanet-halloween-divercity-2026',
      'ariake-quizknock-nazotoki-2026','joypolis-sidem-3-2026','toyosu-kamimaro-202609','dainankyoku-2026'
    )
    and image_usage_status <> 'not_used'
  ) then
    raise exception 'production seed must not publish images';
  end if;

  if has_table_privilege('anon','public.events','select') then
    raise exception 'anon must not directly select public.events after production seed';
  end if;
end;
$$;
