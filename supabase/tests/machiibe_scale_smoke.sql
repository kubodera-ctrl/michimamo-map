-- CI-only 10k/50k/100k search scale smoke. Ephemeral PostgreSQL only.
\set ON_ERROR_STOP on

insert into public.regional_sources(
  source_key,name,source_kind,homepage_url,event_use_allowed,terms_review_status,
  acquisition_mode,automated_fetch_allowed,coverage_scope,image_policy,is_active
) values (
  'ci-scale-source','CI Scale Source','manual','https://example.test/',
  true,'reviewed_facts_only','manual_facts_only',false,'ci_only','not_used',true
)
on conflict(source_key) do nothing;

create or replace function pg_temp.insert_scale_events(p_from integer,p_to integer)
returns void
language plpgsql
as $$
begin
  insert into public.events(
    slug,title,summary,start_date,end_date,start_time,end_time,all_day,schedule_type,
    venue_name,prefecture,municipality,address,location_precision,location_verified,
    price_text,price_type,is_free,organizer_name,official_url,
    category_keys,age_group_keys,indoor,audience_intent,audience_intent_verified,
    source_id,source_event_key,source_page_url,
    verification_status,publication_status,dedupe_key,last_verified_at,image_usage_status
  )
  select
    'ci-scale-'||g,
    case when g%25=0 then '親子 科学 体験イベント '||g else '全国QAイベント '||g end,
    case when g%40=0 then '屋内で楽しめるファミリー向け体験' else null end,
    date '2026-10-01'+(g%90),
    date '2026-10-01'+(g%90)+(g%7),
    case when g%3=0 then time '10:00' else null end,
    case when g%3=0 then time '16:00' else null end,
    g%3<>0,
    'continuous',
    case when g%10=0 then '中央イベントホール' else '会場 '||(g%500) end,
    (array['北海道','東京都','神奈川県','千葉県','埼玉県','大阪府','福岡県','沖縄県'])[(g%8)+1],
    '市区町村'||(g%120),
    null,'unknown',false,
    null,
    (array['free','partly_free','paid','unknown'])[(g%4)+1],
    case when g%4=0 then true when g%4=2 then false else null end,
    '主催者'||(g%300),
    'https://example.test/events/'||g,
    case
      when g%5=0 then array['family','experience']
      when g%5=1 then array['festival']
      when g%5=2 then array['sports']
      when g%5=3 then array['learning']
      else array['entertainment']
    end,
    case when g%4=0 then array['preschool','family'] else '{}'::text[] end,
    case when g%3=0 then true when g%3=1 then false else null end,
    case when g%5=0 then 'child_centered' when g%5=1 then 'family_friendly' else 'general' end,
    g%5 in (0,1),
    (select id from public.regional_sources where source_key='ci-scale-source'),
    'ci-scale-'||g,
    'https://example.test/events/'||g,
    'verified','published','ci-scale-'||g,now(),'not_used'
  from generate_series(p_from,p_to) g
  on conflict(slug) do nothing;
end;
$$;

create or replace function pg_temp.assert_scale(p_expected integer)
returns void
language plpgsql
as $$
declare
  n integer;
  started timestamptz;
  elapsed_ms numeric;
  first_id bigint;
  first_date date;
  second_id bigint;
begin
  select count(*) into n from public.events where slug like 'ci-scale-%';
  if n<>p_expected then
    raise exception 'scale fixture expected %, got %',p_expected,n;
  end if;

  analyze public.events;

  started:=clock_timestamp();
  select count(*) into n
  from public.search_public_events_cursor_v2(
    date '2026-10-01',date '2026-11-30',
    '東京都',null,'体験',array['family','experience'],array['free','partly_free'],
    true,true,null,null,24
  );
  elapsed_ms:=extract(epoch from (clock_timestamp()-started))*1000;
  if elapsed_ms>3000 then
    raise exception 'scale % filtered cursor query too slow: % ms',p_expected,elapsed_ms;
  end if;

  select x.id,x.start_date into first_id,first_date
  from public.search_public_events_cursor_v2(
    date '2026-10-01',date '2026-12-31',
    null,null,null,null,null,false,false,null,null,1
  ) x;

  if first_id is null then raise exception 'scale % first cursor page empty',p_expected; end if;

  select x.id into second_id
  from public.search_public_events_cursor_v2(
    date '2026-10-01',date '2026-12-31',
    null,null,null,null,null,false,false,first_date,first_id,1
  ) x;

  if second_id is null or second_id=first_id then
    raise exception 'scale % cursor did not advance',p_expected;
  end if;

  raise notice 'machiibe scale % rows: filtered cursor query % ms',p_expected,round(elapsed_ms,2);
end;
$$;

select pg_temp.insert_scale_events(1,10000);
select pg_temp.assert_scale(10000);

select pg_temp.insert_scale_events(10001,50000);
select pg_temp.assert_scale(50000);

select pg_temp.insert_scale_events(50001,100000);
select pg_temp.assert_scale(100000);
