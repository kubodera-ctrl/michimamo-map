begin;

create schema if not exists app_private;

create table if not exists app_private.edge_rate_limit_buckets (
  scope text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  expires_at timestamptz not null,
  primary key (scope, subject_hash, window_started_at),
  check (char_length(scope) between 1 and 64),
  check (subject_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists edge_rate_limit_buckets_expiry_idx
  on app_private.edge_rate_limit_buckets (scope, expires_at);

revoke all on schema app_private from public, anon, authenticated;
revoke all on table app_private.edge_rate_limit_buckets from public, anon, authenticated;

create or replace function public.consume_edge_rate_limit(
  p_scope text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(
  allowed boolean,
  retry_after_seconds integer,
  request_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_window_end timestamptz;
  v_request_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_scope is null or p_scope !~ '^[a-z0-9][a-z0-9._:-]{0,63}$' then
    raise exception 'invalid_scope' using errcode = '22023';
  end if;

  if p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_subject_hash' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  if p_window_seconds is null or p_window_seconds < 10 or p_window_seconds > 3600 then
    raise exception 'invalid_window' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );
  v_window_end := v_window_started_at + make_interval(secs => p_window_seconds);

  insert into app_private.edge_rate_limit_buckets (
    scope,
    subject_hash,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    p_scope,
    p_subject_hash,
    v_window_started_at,
    1,
    v_window_end + interval '5 minutes'
  )
  on conflict (scope, subject_hash, window_started_at)
  do update set
    request_count = app_private.edge_rate_limit_buckets.request_count + 1,
    expires_at = excluded.expires_at
  returning app_private.edge_rate_limit_buckets.request_count
  into v_request_count;

  delete from app_private.edge_rate_limit_buckets
  where scope = p_scope
    and expires_at < v_now;

  return query
  select
    v_request_count <= p_limit,
    greatest(1, ceil(extract(epoch from (v_window_end - v_now)))::integer),
    v_request_count;
end;
$$;

revoke all on function public.consume_edge_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, text, integer, integer)
  to service_role;

commit;
