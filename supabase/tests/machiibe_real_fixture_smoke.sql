begin;

\ir fixtures/machiibe_real_events.sql

do $$
declare
  n integer;
  payload jsonb;
  dashboard jsonb;
begin
  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-20',
    p_end_date=>'2026-12-06'
  );
  if n <> 11 then
    raise exception 'real fixture expected 11 public events, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-23',
    p_end_date=>'2026-09-23',
    p_price_types=>array['free'],
    p_audience_intents=>array['child_centered']
  );
  if n <> 1 then
    raise exception '9/23 free child-centered expected SEOPPI only, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-22',
    p_end_date=>'2026-09-23',
    p_keyword=>'東京都水の科学館'
  );
  if n <> 2 then
    raise exception 'custom 9/22-9/23 range expected two water museum events, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-20',
    p_end_date=>'2026-09-20',
    p_fandom_slugs=>array['quizknock']
  );
  if n <> 1 then
    raise exception 'QuizKnock verified fandom expected 1, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-20',
    p_end_date=>'2026-09-20',
    p_fandom_slugs=>array['idolmaster-sidem']
  );
  if n <> 1 then
    raise exception 'SideM verified fandom expected 1, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-23',
    p_end_date=>'2026-09-23',
    p_keyword=>'紙磨呂'
  );
  if n <> 1 then
    raise exception 'Toyosu irregular event should match 9/23, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-24',
    p_end_date=>'2026-09-24',
    p_keyword=>'紙磨呂'
  );
  if n <> 0 then
    raise exception 'Toyosu irregular event must not match non-occurrence 9/24, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-22',
    p_end_date=>'2026-09-22',
    p_accessibility_keys=>array['captions']
  );
  if n <> 1 then
    raise exception 'caption-support search expected Miraikan moon event, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-23',
    p_end_date=>'2026-09-23',
    p_price_types=>array['partly_free']
  );
  if n <> 2 then
    raise exception '9/23 partly-free expected City Circuit + SideM, got %',n;
  end if;

  select count(*) into n
  from public.search_public_events(
    p_start_date=>'2026-09-20',
    p_end_date=>'2026-09-20',
    p_price_types=>array['paid']
  );
  if n <> 4 then
    raise exception '9/20 paid expected Miraikan moon + LittlePlanet + Ariake puzzle + Antarctica, got %',n;
  end if;

  select public.get_public_event('preview-real-ariake-quizknock-nazotoki-2026') into payload;
  if payload is null then
    raise exception 'QuizKnock fixture detail missing';
  end if;
  if not (payload->'fandom_slugs' ? 'quizknock') then
    raise exception 'QuizKnock fandom relation missing from public detail';
  end if;
  if payload->'image_url' <> 'null'::jsonb then
    raise exception 'real fixture must not expose event images';
  end if;

  select public.service_get_machiibe_admin_dashboard(30) into dashboard;
  if jsonb_array_length(dashboard->'newDetected') < 11 then
    raise exception 'admin newDetected expected at least 11 real fixture rows';
  end if;

  if exists (
    select 1 from public.events
    where slug like 'preview-real-%' and image_usage_status <> 'not_used'
  ) then
    raise exception 'all real fixtures must keep image_usage_status=not_used';
  end if;
end;
$$;

rollback;
