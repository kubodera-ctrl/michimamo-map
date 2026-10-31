-- R11 PRIVATE metadata only, non-production DRAFT. DO NOT APPLY to MAP or any persistent DB.
-- Represents a public-form DELIVERY MESSAGE EXPORT WINDOW, not an individual crime.
-- No message body, addresses, victim columns, auth changes, direct API or publish RPC.
-- Requires separate approval, privacy assessment and versioned migration before use.

create schema if not exists police_private;
revoke all on schema police_private from public, anon, authenticated;

create table if not exists police_private.mail_delivery_window_reviews (
  id bigint generated always as identity primary key,
  source_id text not null default 'tokyo_mail_keishicho_opendata'
    check (source_id = 'tokyo_mail_keishicho_opendata'),
  window_start date not null,
  window_end_exclusive date not null,
  version integer not null check (version between 1 and 200),
  source_export_sha256 text not null check (source_export_sha256 ~ '^[0-9a-f]{64}$'),
  guarded_form_receipt_sha256 text not null check (guarded_form_receipt_sha256 ~ '^[0-9a-f]{64}$'),
  row_count integer not null check (row_count between 1 and 20000),
  repeated_text_occurrences integer not null default 0
    check (repeated_text_occurrences >= 0 and repeated_text_occurrences < row_count),
  review_state text not null default 'pending_manual_review'
    check (review_state in ('pending_manual_review','superseded_review_history')),
  rights_status text not null default 'unverified' check (rights_status='unverified'),
  is_official_event_identity boolean not null default false check (not is_official_event_identity),
  automatic_correction boolean not null default false check (not automatic_correction),
  automatic_withdrawal boolean not null default false check (not automatic_withdrawal),
  publication_enabled boolean not null default false check (not publication_enabled),
  points_awarded boolean not null default false check (not points_awarded),
  inserted_at timestamptz not null default now(),
  unique (source_id,window_start,window_end_exclusive,version),
  check (window_end_exclusive = window_start + 1),
  check (window_start >= date '2025-01-01' and window_start <= date '2100-12-31')
);

create unique index if not exists mail_delivery_one_current_window
  on police_private.mail_delivery_window_reviews(source_id,window_start,window_end_exclusive)
  where review_state='pending_manual_review';

alter table police_private.mail_delivery_window_reviews enable row level security;
alter table police_private.mail_delivery_window_reviews force row level security;
revoke all on table police_private.mail_delivery_window_reviews from public,anon,authenticated;
revoke all on all sequences in schema police_private from public,anon,authenticated;
-- NO GRANT to service_role in this draft. NO public view, definer function, Data API,
-- or public/offline release operation. Existing MAP admin boundary is not altered.
