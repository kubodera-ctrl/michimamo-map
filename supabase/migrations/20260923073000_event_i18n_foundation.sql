-- まちイベ multilingual event translation foundation.
-- Canonical Japanese event facts remain in public.events.
-- Only reviewed translations are exposed publicly.
begin;

create table if not exists public.event_translations (
  event_id bigint not null references public.events(id) on delete cascade,
  locale text not null
    check (locale in ('en','zh-cn','zh-tw','ko')),
  title text not null check (char_length(title) between 1 and 300),
  summary text,
  status_note text,
  venue_name text,
  address_text text,
  price_text text,
  reservation_text text,
  organizer_name text,
  accessibility_notes text,
  translation_source text not null default 'machine'
    check (translation_source in ('manual','provider','machine','machine_reviewed')),
  review_status text not null default 'draft'
    check (review_status in ('draft','needs_review','approved','rejected')),
  source_url text check (source_url is null or source_url ~* '^https?://'),
  translated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(event_id,locale),
  constraint event_translations_review_gate_ck
    check (
      review_status <> 'approved'
      or translation_source in ('manual','provider','machine_reviewed')
    )
);

create index if not exists event_translations_locale_review_idx
  on public.event_translations(locale,review_status,event_id);

alter table public.event_translations enable row level security;
revoke all on table public.event_translations from anon,authenticated;

create or replace function public.get_public_event_translations(
  p_event_ids bigint[],
  p_locale text
)
returns table(
  event_id bigint,
  locale text,
  title text,
  summary text,
  status_note text,
  venue_name text,
  address_text text,
  price_text text,
  reservation_text text,
  organizer_name text,
  accessibility_notes text,
  translation_source text,
  reviewed_at timestamptz
)
language sql
security definer
stable
set search_path=public,pg_temp
as $$
  select
    t.event_id,
    t.locale,
    t.title,
    t.summary,
    t.status_note,
    t.venue_name,
    t.address_text,
    t.price_text,
    t.reservation_text,
    t.organizer_name,
    t.accessibility_notes,
    t.translation_source,
    t.reviewed_at
  from public.event_translations t
  join public.events e on e.id=t.event_id
  join public.regional_sources s on s.id=e.source_id
  where t.locale=lower(coalesce(p_locale,''))
    and t.locale in ('en','zh-cn','zh-tw','ko')
    and t.review_status='approved'
    and t.event_id=any(coalesce(p_event_ids[1:100],'{}'::bigint[]))
    and e.publication_status='published'
    and e.verification_status='verified'
    and s.is_active
    and s.event_use_allowed
    and (e.expires_at is null or e.expires_at>now())
  order by t.event_id;
$$;

revoke all on function public.get_public_event_translations(bigint[],text)
  from public,anon,authenticated;
grant execute on function public.get_public_event_translations(bigint[],text)
  to anon,authenticated;

comment on table public.event_translations is
  'まちイベ公開イベントの言語別翻訳。canonical日本語事実はeventsに保持し、approved翻訳のみ公開する。';

commit;
