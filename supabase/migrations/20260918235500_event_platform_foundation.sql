-- まちイベ E0 foundation.
-- Shared Supabase backend, isolated public RPC surface.
-- Not applied to production yet: review in staging first.
begin;

create table if not exists public.regional_sources (
  id bigint generated always as identity primary key,
  source_key text not null unique,
  name text not null,
  source_kind text not null
    check (source_kind in ('official_api','open_data','rss','manual','provider_submission','partner_feed')),
  homepage_url text not null check (homepage_url ~* '^https?://'),
  data_url text check (data_url is null or data_url ~* '^https?://'),
  terms_url text check (terms_url is null or terms_url ~* '^https?://'),
  license_text text,
  prefecture text,
  municipality text,
  event_use_allowed boolean not null default false,
  image_policy text not null default 'not_used'
    check (image_policy in ('not_used','link_only','reuse_allowed','permission_required')),
  fetch_status text not null default 'unknown'
    check (fetch_status in ('unknown','healthy','degraded','disabled')),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures >= 0),
  notes text,
  is_active boolean not null default true,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,159}$'),
  title text not null check (char_length(title) between 1 and 300),
  summary text,
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  timezone text not null default 'Asia/Tokyo',
  all_day boolean not null default true,
  schedule_type text not null default 'continuous'
    check (schedule_type in ('single','continuous','recurring','irregular')),

  event_status text not null default 'scheduled'
    check (event_status in ('scheduled','changed','postponed','cancelled','sold_out','registration_closed')),
  status_note text,
  status_updated_at timestamptz,

  venue_name text,
  postal_code text,
  prefecture text not null,
  municipality text,
  address text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location_precision text not null default 'unknown'
    check (location_precision in ('exact_venue','exact_address','street','approximate','unknown')),
  location_verified boolean not null default false,
  place_external_id text,

  price_text text,
  price_type text not null default 'unknown'
    check (price_type in ('free','partly_free','paid','unknown')),
  is_free boolean,
  reservation_required boolean,
  reservation_text text,
  organizer_name text,
  official_url text not null check (official_url ~* '^https?://'),
  ticket_url text check (ticket_url is null or ticket_url ~* '^https?://'),

  category_keys text[] not null default '{}',
  age_group_keys text[] not null default '{}',
  indoor boolean,

  audience_intent text not null default 'general'
    check (audience_intent in ('child_centered','family_friendly','general','adult_oriented')),
  audience_intent_verified boolean not null default false,

  accessibility_keys text[] not null default '{}',
  accessibility_notes text,

  image_url text check (image_url is null or image_url ~* '^https?://'),
  image_source_url text check (image_source_url is null or image_source_url ~* '^https?://'),
  image_license text,
  image_usage_status text not null default 'not_used'
    check (image_usage_status in ('not_used','allowed','link_only','permission_required')),

  source_id bigint not null references public.regional_sources(id),
  source_event_key text,
  source_page_url text not null check (source_page_url ~* '^https?://'),
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),

  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','needs_review')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','expired','hidden')),
  dedupe_key text,
  duplicate_group text,
  expires_at timestamptz,
  last_verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date),
  check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null))
);

create table if not exists public.event_occurrences (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  occurrence_date date not null,
  start_time time,
  end_time time,
  status text not null default 'scheduled'
    check (status in ('scheduled','cancelled','sold_out','registration_closed')),
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_occurrences_unique_idx
  on public.event_occurrences(event_id, occurrence_date, coalesce(start_time, time '00:00'));
create index if not exists event_occurrences_date_idx
  on public.event_occurrences(occurrence_date, event_id);

create table if not exists public.fandom_entities (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  display_name text not null,
  aliases text[] not null default '{}',
  entity_type text not null default 'franchise'
    check (entity_type in ('character','franchise','creator','studio','brand','series','influencer','artist','other')),
  official_url text check (official_url is null or official_url ~* '^https?://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_fandom_links (
  event_id bigint not null references public.events(id) on delete cascade,
  fandom_id bigint not null references public.fandom_entities(id) on delete cascade,
  relation_type text not null default 'official_event'
    check (relation_type in ('official_event','licensed_collaboration','venue_collaboration','fan_event','mentioned')),
  verification_status text not null default 'needs_review'
    check (verification_status in ('needs_review','verified','hidden')),
  source_url text not null check (source_url ~* '^https?://'),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(event_id, fandom_id)
);

insert into public.fandom_entities(slug,display_name,aliases,entity_type)
values
  ('chiikawa','ちいかわ',array['ちいかわ'],'franchise'),
  ('pokemon','ポケモン',array['ポケモン','Pokémon','Pokemon'],'franchise'),
  ('sanrio','サンリオ',array['サンリオ','Sanrio'],'brand'),
  ('hello-kitty','ハローキティ',array['ハローキティ','キティ'],'character'),
  ('kuromi','クロミ',array['クロミ'],'character'),
  ('cinnamoroll','シナモロール',array['シナモロール','シナモン'],'character'),
  ('detective-conan','名探偵コナン',array['名探偵コナン','コナン'],'franchise'),
  ('sumikkogurashi','すみっコぐらし',array['すみっコぐらし','すみっこぐらし'],'franchise'),
  ('aipri','アイプリ',array['アイプリ'],'franchise'),
  ('precure','プリキュア',array['プリキュア'],'franchise'),
  ('kamen-rider','仮面ライダー',array['仮面ライダー'],'franchise'),
  ('super-sentai','スーパー戦隊',array['スーパー戦隊','戦隊'],'franchise'),
  ('ultraman','ウルトラマン',array['ウルトラマン'],'franchise'),
  ('doraemon','ドラえもん',array['ドラえもん'],'franchise'),
  ('anpanman','アンパンマン',array['アンパンマン'],'franchise'),
  ('crayon-shinchan','クレヨンしんちゃん',array['クレヨンしんちゃん','しんちゃん'],'franchise'),
  ('super-mario','スーパーマリオ',array['スーパーマリオ','マリオ'],'franchise'),
  ('kirby','星のカービィ',array['星のカービィ','カービィ'],'franchise'),
  ('animal-crossing','どうぶつの森',array['どうぶつの森','あつ森'],'franchise'),
  ('idolmaster-sidem','アイドルマスター SideM',array['アイドルマスター SideM','SideM','サイドエム'],'franchise'),
  ('tamagotchi','たまごっち',array['たまごっち'],'brand'),
  ('sylvanian-families','シルバニアファミリー',array['シルバニアファミリー','シルバニア'],'brand'),
  ('miffy','ミッフィー',array['ミッフィー','miffy'],'character'),
  ('paw-patrol','パウ・パトロール',array['パウ・パトロール','パウパト'],'franchise'),
  ('thomas','きかんしゃトーマス',array['きかんしゃトーマス','トーマス'],'franchise'),
  ('disney','ディズニー',array['ディズニー','Disney'],'brand'),
  ('pixar','ピクサー',array['ピクサー','Pixar','PIXAR'],'studio'),
  ('minions','ミニオン',array['ミニオン','Minions'],'franchise'),
  ('ghibli','ジブリ',array['ジブリ','スタジオジブリ'],'studio'),
  ('hayao-miyazaki','宮崎駿',array['宮崎駿'],'creator'),
  ('one-piece','ONE PIECE',array['ONE PIECE','ワンピース'],'franchise'),
  ('demon-slayer','鬼滅の刃',array['鬼滅の刃','鬼滅'],'franchise'),
  ('spy-family','SPY×FAMILY',array['SPY×FAMILY','SPY FAMILY','スパイファミリー'],'franchise'),
  ('my-hero-academia','僕のヒーローアカデミア',array['僕のヒーローアカデミア','ヒロアカ','My Hero Academia','MHA'],'franchise'),
  ('haikyu','ハイキュー!!',array['ハイキュー!!','ハイキュー','HAIKYU!!','Haikyu!!'],'franchise'),
  ('jujutsu-kaisen','呪術廻戦',array['呪術廻戦','呪術','Jujutsu Kaisen'],'franchise'),
  ('hunter-x-hunter','HUNTER×HUNTER',array['HUNTER×HUNTER','HUNTER x HUNTER','ハンターハンター','ハンター×ハンター'],'franchise'),
  ('naruto','NARUTO',array['NARUTO','ナルト','NARUTO -ナルト-'],'franchise'),
  ('bleach','BLEACH',array['BLEACH','ブリーチ'],'franchise'),
  ('gintama','銀魂',array['銀魂','ぎんたま'],'franchise'),
  ('prince-of-tennis','テニスの王子様',array['テニスの王子様','テニプリ','新テニスの王子様','新テニ'],'franchise'),
  ('kuroko-basketball','黒子のバスケ',array['黒子のバスケ','黒バス'],'franchise'),
  ('world-trigger','ワールドトリガー',array['ワールドトリガー','ワートリ'],'franchise'),
  ('blue-exorcist','青の祓魔師',array['青の祓魔師','青エク'],'franchise'),
  ('chainsaw-man','チェンソーマン',array['チェンソーマン','Chainsaw Man'],'franchise'),
  ('sakamoto-days','SAKAMOTO DAYS',array['SAKAMOTO DAYS','サカモトデイズ','サカデイ'],'franchise'),
  ('shinako','しなこ',array['しなこ','しなこちゃん'],'influencer'),
  ('takeshita-paradise','竹下☆ぱらだいす',array['竹下☆ぱらだいす','竹下ぱらだいす','竹ぱら'],'influencer'),
  ('colorful-peach','カラフルピーチ',array['カラフルピーチ','からぴち'],'influencer'),
  ('tiropino','ちろぴの',array['ちろぴの','チロピノ'],'influencer'),
  ('bom-bom-tv','ボンボンTV',array['ボンボンTV','ボンボンティービー'],'influencer'),
  ('rocomacoaco','ろこまこあこ',array['ろこまこあこ','RMA'],'influencer'),
  ('quizknock','QuizKnock',array['QuizKnock','クイズノック'],'creator')
on conflict(slug) do update
set display_name=excluded.display_name,
    aliases=excluded.aliases,
    entity_type=excluded.entity_type,
    updated_at=now();

create table if not exists public.event_source_records (
  id bigint generated always as identity primary key,
  source_id bigint not null references public.regional_sources(id) on delete cascade,
  source_event_key text not null,
  event_id bigint references public.events(id) on delete set null,
  source_title text,
  source_start_date date,
  source_end_date date,
  source_venue_name text,
  source_url text not null check (source_url ~* '^https?://'),
  content_hash text,
  normalization_status text not null default 'pending'
    check (normalization_status in ('pending','normalized','needs_review','ignored')),
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, source_event_key)
);

create index if not exists events_public_date_idx
  on public.events(publication_status, verification_status, start_date, end_date);
create index if not exists events_prefecture_date_idx
  on public.events(prefecture, start_date, end_date)
  where publication_status='published' and verification_status='verified';
create index if not exists events_categories_gin_idx on public.events using gin(category_keys);
create index if not exists events_age_groups_gin_idx on public.events using gin(age_group_keys);
create index if not exists events_accessibility_gin_idx on public.events using gin(accessibility_keys);
create index if not exists events_audience_idx on public.events(audience_intent,audience_intent_verified);
create unique index if not exists events_dedupe_key_unique_idx
  on public.events(dedupe_key) where dedupe_key is not null;
create unique index if not exists events_source_key_unique_idx
  on public.events(source_id,source_event_key) where source_event_key is not null;
create index if not exists fandom_entities_aliases_gin_idx on public.fandom_entities using gin(aliases);
create index if not exists event_fandom_links_verified_idx
  on public.event_fandom_links(fandom_id,event_id) where verification_status='verified';

alter table public.regional_sources enable row level security;
alter table public.events enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.fandom_entities enable row level security;
alter table public.event_fandom_links enable row level security;
alter table public.event_source_records enable row level security;

revoke all on table public.regional_sources from anon,authenticated;
revoke all on table public.events from anon,authenticated;
revoke all on table public.event_occurrences from anon,authenticated;
revoke all on table public.fandom_entities from anon,authenticated;
revoke all on table public.event_fandom_links from anon,authenticated;
revoke all on table public.event_source_records from anon,authenticated;

create or replace function public.search_public_events(
  p_start_date date default ((now() at time zone 'Asia/Tokyo')::date),
  p_end_date date default (((now() at time zone 'Asia/Tokyo')::date)+29),
  p_prefecture text default null,
  p_keyword text default null,
  p_exclude_terms text[] default null,
  p_categories text[] default null,
  p_age_groups text[] default null,
  p_duration_buckets text[] default null,
  p_accessibility_only boolean default false,
  p_accessibility_keys text[] default null,
  p_audience_intents text[] default null,
  p_fandom_slugs text[] default null,
  p_fandom_keyword text default null,
  p_price_types text[] default null,
  p_created_after timestamptz default null,
  p_exclude_adult_oriented boolean default false,
  p_indoor_only boolean default false,
  p_sort text default 'recommended',
  p_limit integer default 60,
  p_offset integer default 0
)
returns table(
  id bigint, slug text, title text, summary text, start_date date, end_date date,
  duration_days integer, start_time time, end_time time, all_day boolean, schedule_type text,
  event_status text, status_note text,
  venue_name text, prefecture text, municipality text, address text,
  latitude double precision, longitude double precision,
  location_precision text, location_verified boolean,
  price_text text, price_type text, is_free boolean,
  reservation_required boolean, organizer_name text, official_url text,
  category_keys text[], age_group_keys text[], indoor boolean, audience_intent text,
  fandom_slugs text[], accessibility_keys text[], accessibility_notes text, image_url text,
  source_name text, source_url text, source_updated_at timestamptz,
  last_verified_at timestamptz, created_at timestamptz, updated_at timestamptz
)
language sql security definer stable set search_path=public,pg_temp
as $$
  select
    e.id,e.slug,e.title,e.summary,e.start_date,e.end_date,
    (e.end_date-e.start_date+1)::integer,e.start_time,e.end_time,e.all_day,e.schedule_type,
    e.event_status,e.status_note,
    e.venue_name,e.prefecture,e.municipality,e.address,e.latitude,e.longitude,
    e.location_precision,e.location_verified,
    e.price_text,e.price_type,e.is_free,e.reservation_required,e.organizer_name,e.official_url,
    e.category_keys,e.age_group_keys,e.indoor,
    case when e.audience_intent_verified then e.audience_intent else 'general' end,
    coalesce((
      select array_agg(fe.slug order by fe.display_name)
      from public.event_fandom_links efl
      join public.fandom_entities fe on fe.id=efl.fandom_id
      where efl.event_id=e.id and efl.verification_status='verified' and fe.is_active
    ),'{}'::text[]),
    e.accessibility_keys,e.accessibility_notes,
    case when e.image_usage_status='allowed' then e.image_url else null end,
    s.name,coalesce(e.source_page_url,s.data_url,s.homepage_url),
    e.source_updated_at,e.last_verified_at,e.created_at,e.updated_at
  from public.events e
  join public.regional_sources s on s.id=e.source_id
  where e.publication_status='published'
    and e.verification_status='verified'
    and s.is_active and s.event_use_allowed
    and (
      (
        e.schedule_type in ('single','continuous')
        and e.end_date>=coalesce(p_start_date,((now() at time zone 'Asia/Tokyo')::date))
        and e.start_date<=coalesce(p_end_date,((now() at time zone 'Asia/Tokyo')::date)+29)
      )
      or (
        e.schedule_type in ('recurring','irregular')
        and exists (
          select 1
          from public.event_occurrences eo
          where eo.event_id=e.id
            and eo.occurrence_date between coalesce(p_start_date,((now() at time zone 'Asia/Tokyo')::date)) and coalesce(p_end_date,((now() at time zone 'Asia/Tokyo')::date)+29)
            and eo.status = 'scheduled'
        )
      )
    )
    and (p_prefecture is null or btrim(p_prefecture)='' or e.prefecture=left(btrim(p_prefecture),20))
    and (
      p_keyword is null or btrim(p_keyword)=''
      or e.title ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.summary,'') ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.venue_name,'') ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.municipality,'') ilike '%'||left(btrim(p_keyword),100)||'%'
      or coalesce(e.organizer_name,'') ilike '%'||left(btrim(p_keyword),100)||'%'
    )
    and not exists (
      select 1 from unnest(coalesce(p_exclude_terms[1:20],'{}'::text[])) excluded(term)
      where btrim(excluded.term)<>''
        and strpos(lower(concat_ws(' ',e.title,coalesce(e.summary,''),coalesce(e.venue_name,''),
          coalesce(e.municipality,''),coalesce(e.organizer_name,''),coalesce(e.price_text,''))),
          lower(left(btrim(excluded.term),80)))>0
    )
    and (p_categories is null or cardinality(p_categories)=0 or e.category_keys&&p_categories[1:20])
    and (p_age_groups is null or cardinality(p_age_groups)=0 or e.age_group_keys&&p_age_groups[1:20])
    and (
      p_duration_buckets is null or cardinality(p_duration_buckets)=0
      or ('single'=any(p_duration_buckets[1:10]) and (e.end_date-e.start_date+1)=1)
      or ('2_4'=any(p_duration_buckets[1:10]) and (e.end_date-e.start_date+1) between 2 and 4)
      or ('5_10'=any(p_duration_buckets[1:10]) and (e.end_date-e.start_date+1) between 5 and 10)
      or ('11_30'=any(p_duration_buckets[1:10]) and (e.end_date-e.start_date+1) between 11 and 30)
      or ('31_plus'=any(p_duration_buckets[1:10]) and (e.end_date-e.start_date+1)>=31)
    )
    and (not coalesce(p_accessibility_only,false) or cardinality(e.accessibility_keys)>0)
    and (p_accessibility_keys is null or cardinality(p_accessibility_keys)=0 or e.accessibility_keys@>p_accessibility_keys[1:20])
    and (p_audience_intents is null or cardinality(p_audience_intents)=0
      or (e.audience_intent_verified and e.audience_intent=any(p_audience_intents[1:10])))
    and (
      p_fandom_slugs is null or cardinality(p_fandom_slugs)=0
      or exists (
        select 1 from public.event_fandom_links efl
        join public.fandom_entities fe on fe.id=efl.fandom_id
        where efl.event_id=e.id and efl.verification_status='verified'
          and fe.is_active and fe.slug=any(p_fandom_slugs[1:20])
      )
    )
    and (
      p_fandom_keyword is null or btrim(p_fandom_keyword)=''
      or e.title ilike '%'||left(btrim(p_fandom_keyword),80)||'%'
      or coalesce(e.summary,'') ilike '%'||left(btrim(p_fandom_keyword),80)||'%'
      or coalesce(e.organizer_name,'') ilike '%'||left(btrim(p_fandom_keyword),80)||'%'
      or exists (
        select 1
        from public.event_fandom_links efl
        join public.fandom_entities fe on fe.id=efl.fandom_id
        where efl.event_id=e.id
          and efl.verification_status='verified'
          and fe.is_active
          and (
            fe.display_name ilike '%'||left(btrim(p_fandom_keyword),80)||'%'
            or exists (
              select 1
              from unnest(fe.aliases) as fandom_alias(value)
              where fandom_alias.value ilike '%'||left(btrim(p_fandom_keyword),80)||'%'
            )
          )
      )
    )
    and (p_price_types is null or cardinality(p_price_types)=0 or e.price_type=any(p_price_types[1:10]))
    and (p_created_after is null or e.created_at > p_created_after)
    and (not coalesce(p_exclude_adult_oriented,false)
      or not (e.audience_intent_verified and e.audience_intent='adult_oriented'))
    and (not coalesce(p_indoor_only,false) or e.indoor is true)
    and (e.expires_at is null or e.expires_at>now())
  order by
    case e.event_status
      when 'scheduled' then 0 when 'changed' then 1 when 'registration_closed' then 2
      when 'sold_out' then 3 when 'postponed' then 4 when 'cancelled' then 5 else 6
    end,
    case when coalesce(p_sort,'recommended')='newest' then e.created_at end desc nulls last,
    case when coalesce(p_sort,'recommended')='short_first' then (e.end_date-e.start_date+1) end asc nulls last,
    case when coalesce(p_sort,'recommended')='recommended'
      then case when e.start_date<coalesce(p_start_date,((now() at time zone 'Asia/Tokyo')::date)) then 1 else 0 end end asc nulls last,
    case when coalesce(p_sort,'recommended')='recommended'
      then (e.end_date-e.start_date+1) end asc nulls last,
    e.start_date,e.start_time nulls first,e.title
  limit least(greatest(coalesce(p_limit,60),1),100)
  offset least(greatest(coalesce(p_offset,0),0),50000);
$$;

revoke all on function public.search_public_events(date,date,text,text,text[],text[],text[],text[],boolean,text[],text[],text[],text,text[],timestamptz,boolean,boolean,text,integer,integer)
  from public,anon,authenticated;
grant execute on function public.search_public_events(date,date,text,text,text[],text[],text[],text[],boolean,text[],text[],text[],text,text[],timestamptz,boolean,boolean,text,integer,integer)
  to anon,authenticated;

create or replace function public.get_public_event(p_slug text)
returns jsonb
language sql security definer stable set search_path=public,pg_temp
as $$
  select to_jsonb(x)
  from (
    select
      e.id,e.slug,e.title,e.summary,e.start_date,e.end_date,
      (e.end_date-e.start_date+1)::integer as duration_days,
      e.start_time,e.end_time,e.timezone,e.all_day,e.schedule_type,
      e.event_status,e.status_note,e.status_updated_at,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'date',eo.occurrence_date,
            'start_time',eo.start_time,
            'end_time',eo.end_time,
            'status',eo.status,
            'source_note',eo.source_note
          )
          order by eo.occurrence_date,eo.start_time nulls first
        )
        from (
          select occurrence_date,start_time,end_time,status,source_note
          from public.event_occurrences
          where event_id=e.id
            and occurrence_date >= ((now() at time zone 'Asia/Tokyo')::date)-7
            and occurrence_date <= ((now() at time zone 'Asia/Tokyo')::date)+400
          order by occurrence_date,start_time nulls first
          limit 500
        ) eo
      ),'[]'::jsonb) as occurrences,
      e.venue_name,e.postal_code,e.prefecture,e.municipality,e.address,e.latitude,e.longitude,
      e.location_precision,e.location_verified,e.place_external_id,
      e.price_text,e.price_type,e.is_free,e.reservation_required,e.reservation_text,e.organizer_name,
      e.official_url,e.ticket_url,e.category_keys,e.age_group_keys,e.indoor,
      case when e.audience_intent_verified then e.audience_intent else 'general' end as audience_intent,
      coalesce((
        select array_agg(fe.slug order by fe.display_name)
        from public.event_fandom_links efl
        join public.fandom_entities fe on fe.id=efl.fandom_id
        where efl.event_id=e.id and efl.verification_status='verified' and fe.is_active
      ),'{}'::text[]) as fandom_slugs,
      e.accessibility_keys,e.accessibility_notes,
      case when e.image_usage_status='allowed' then e.image_url else null end as image_url,
      case when e.image_usage_status='allowed' then e.image_source_url else null end as image_source_url,
      case when e.image_usage_status='allowed' then e.image_license else null end as image_license,
      s.name as source_name,coalesce(e.source_page_url,s.data_url,s.homepage_url) as source_url,
      e.source_updated_at,e.fetched_at,e.last_verified_at,e.created_at,e.updated_at
    from public.events e
    join public.regional_sources s on s.id=e.source_id
    where e.slug=p_slug and e.publication_status='published' and e.verification_status='verified'
      and s.is_active and s.event_use_allowed and (e.expires_at is null or e.expires_at>now())
    limit 1
  ) x;
$$;

revoke all on function public.get_public_event(text) from public,anon,authenticated;
grant execute on function public.get_public_event(text) to anon,authenticated;

create or replace function public.get_public_events_by_slugs(p_slugs text[])
returns jsonb
language sql security definer stable set search_path=public,pg_temp
as $$
  select coalesce(
    jsonb_agg(public.get_public_event(x.slug) order by x.ord)
      filter (where public.get_public_event(x.slug) is not null),
    '[]'::jsonb
  )
  from unnest(coalesce(p_slugs,'{}'::text[])) with ordinality as x(slug,ord)
  where x.ord <= 100;
$$;

revoke all on function public.get_public_events_by_slugs(text[]) from public,anon,authenticated;
grant execute on function public.get_public_events_by_slugs(text[]) to anon,authenticated;

create or replace function public.get_public_event_sitemap(p_limit integer default 50000)
returns table(slug text,updated_at timestamptz)
language sql security definer stable set search_path=public,pg_temp
as $$
  select e.slug,e.updated_at
  from public.events e join public.regional_sources s on s.id=e.source_id
  where e.publication_status='published' and e.verification_status='verified'
    and s.is_active and s.event_use_allowed
    and e.end_date>=((now() at time zone 'Asia/Tokyo')::date)-7
    and (e.expires_at is null or e.expires_at>now())
  order by e.updated_at desc
  limit least(greatest(coalesce(p_limit,50000),1),50000);
$$;

revoke all on function public.get_public_event_sitemap(integer) from public,anon,authenticated;
grant execute on function public.get_public_event_sitemap(integer) to anon,authenticated;

create or replace function public.get_public_fandom_sitemap(p_min_events integer default 3)
returns table(slug text,updated_at timestamptz,event_count bigint)
language sql security definer stable set search_path=public,pg_temp
as $$
  select fe.slug,max(greatest(e.updated_at,efl.updated_at,fe.updated_at)),count(distinct e.id)::bigint
  from public.fandom_entities fe
  join public.event_fandom_links efl on efl.fandom_id=fe.id
  join public.events e on e.id=efl.event_id
  join public.regional_sources s on s.id=e.source_id
  where fe.is_active and efl.verification_status='verified'
    and e.publication_status='published' and e.verification_status='verified'
    and e.event_status not in ('cancelled','postponed')
    and s.is_active and s.event_use_allowed
    and e.end_date>=((now() at time zone 'Asia/Tokyo')::date)-7
    and (e.expires_at is null or e.expires_at>now())
  group by fe.slug
  having count(distinct e.id)>=greatest(coalesce(p_min_events,3),1)
  order by fe.slug;
$$;

revoke all on function public.get_public_fandom_sitemap(integer) from public,anon,authenticated;
grant execute on function public.get_public_fandom_sitemap(integer) to anon,authenticated;

create or replace function public.get_public_facet_sitemap(p_min_events integer default 3)
returns table(kind text,key text,updated_at timestamptz,event_count bigint)
language sql security definer stable set search_path=public,pg_temp
as $$
  with public_events as (
    select e.*
    from public.events e
    join public.regional_sources s on s.id=e.source_id
    where e.publication_status='published'
      and e.verification_status='verified'
      and e.event_status not in ('cancelled','postponed')
      and s.is_active and s.event_use_allowed
      and e.end_date>=((now() at time zone 'Asia/Tokyo')::date)-7
      and (e.expires_at is null or e.expires_at>now())
  ),
  prefectures as (
    select 'prefecture'::text as kind,e.prefecture as key,max(e.updated_at) as updated_at,count(*)::bigint as event_count
    from public_events e
    group by e.prefecture
    having count(*)>=greatest(coalesce(p_min_events,3),1)
  ),
  categories as (
    select 'category'::text as kind,c.key,max(e.updated_at) as updated_at,count(distinct e.id)::bigint as event_count
    from public_events e
    cross join lateral unnest(e.category_keys) c(key)
    group by c.key
    having count(distinct e.id)>=greatest(coalesce(p_min_events,3),1)
  )
  select * from prefectures
  union all
  select * from categories
  order by kind,key;
$$;

revoke all on function public.get_public_facet_sitemap(integer) from public,anon,authenticated;
grant execute on function public.get_public_facet_sitemap(integer) to anon,authenticated;

comment on table public.regional_sources is '地域情報エンジンの情報源台帳。取得健全性も保持する。';
comment on table public.events is 'まちイベの正規化済みcanonical event。事実項目を推測で埋めない。';
comment on table public.event_occurrences is '継続・不定期イベントの実開催日。';
comment on table public.fandom_entities is '推し活検索用の正規化辞書。名称は識別用で画像・ロゴ利用権を意味しない。';
comment on table public.event_fandom_links is 'イベントと推し活対象の確認済み関連。relation_typeと出典を保持。';
comment on table public.event_source_records is '取得元ごとのイベント記録とcanonical eventの紐付け。';

commit;
