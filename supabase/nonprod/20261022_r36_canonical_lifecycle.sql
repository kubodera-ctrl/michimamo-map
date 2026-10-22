-- NONPROD_ONLY. R36 tightened R35 candidate. Do not apply to Production.
-- R35 -- NONPRODUCTION ONLY. Minimal existing-event update contract.
-- No background connection or automatic publication. Event and provenance
-- changes, plus an audit entry, are one atomic PostgreSQL function call.
-- Requires the existing P5 event + source tables and R33 ingestion schema.

create table if not exists public.machiibe_nonprod_event_change_audit (
  id bigint generated always as identity primary key,
  event_id bigint references public.events(id) on delete cascade,
  source_id bigint references public.regional_sources(id) on delete cascade,
  source_event_key text not null,
  previous_hash text not null,
  next_hash text not null,
  changed_fields text[] not null default '{}',
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.machiibe_nonprod_event_change_audit enable row level security;
revoke all on table public.machiibe_nonprod_event_change_audit from public,anon,authenticated;
revoke all on sequence public.machiibe_nonprod_event_change_audit_id_seq from public,anon,authenticated;
grant select,insert on table public.machiibe_nonprod_event_change_audit to service_role;
grant usage,select on sequence public.machiibe_nonprod_event_change_audit_id_seq to service_role;
comment on table public.machiibe_nonprod_event_change_audit is 'R35 nonProd-only change audit. No production/publication automation.';

create or replace function public.machiibe_nonprod_apply_existing_event_r36(
  p_event_id bigint,
  p_source_id bigint,
  p_source_event_key text,
  p_expected_hash text,
  p_new_hash text,
  p_patch jsonb,
  p_status_evidence_url text default null,
  p_status_evidence_at timestamptz default null
)
returns table(updated_event_id bigint, updated_source_record_id bigint, previous_hash text, next_hash text)
language plpgsql volatile security invoker set search_path=public,pg_temp
as $$
declare
  v_source public.regional_sources%rowtype;
  v_before public.events%rowtype;
  v_record public.event_source_records%rowtype;
  v_after public.events%rowtype;
  v_key text;
  v_changed text[];
begin
  if p_event_id is null or p_source_id is null or coalesce(btrim(p_source_event_key),'') = ''
    or p_expected_hash !~ '^[a-f0-9]{64}$' or p_new_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'R36_BAD_IDENTITY_OR_HASH';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'R36_EMPTY_OR_NONOBJECT_PATCH';
  end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('title','start_date','end_date','venue_name','price_type','event_status') then
      raise exception 'R36_UNAPPROVED_FIELD:%',v_key;
    end if;
  end loop;
  if p_patch ? 'start_date' and (p_patch->>'start_date') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'R36_INVALID_START_DATE';
  end if;
  if p_patch ? 'end_date' and (p_patch->>'end_date') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'R36_INVALID_END_DATE';
  end if;
  if p_patch ? 'title' and (coalesce(char_length(p_patch->>'title'),0) not between 1 and 300) then
    raise exception 'R36_INVALID_TITLE';
  end if;
  if p_patch ? 'price_type' and (p_patch->>'price_type') not in ('free','partly_free','paid','unknown') then
    raise exception 'R36_INVALID_PRICE_TYPE';
  end if;
  if p_patch ? 'event_status' and (p_patch->>'event_status') not in
     ('scheduled','changed','postponed','cancelled','sold_out','registration_closed') then
    raise exception 'R36_INVALID_EVENT_STATUS';
  end if;
  -- Every status transition requires explicit event-specific source evidence.
  if p_patch ? 'event_status' and
    (p_status_evidence_url is null or p_status_evidence_at is null or p_status_evidence_at>now()
     or p_status_evidence_at < now()-interval '30 days') then
    raise exception 'R36_STATUS_EVIDENCE_REQUIRED';
  end if;
  select * into v_source from public.regional_sources where id=p_source_id;
  if not found or v_source.is_active is not true or v_source.automated_fetch_allowed is not true
    or v_source.terms_review_status <> 'reviewed_allowed'
    or v_source.event_use_allowed is not true
    or v_source.robots_status not in ('allowed','not_applicable')
    or v_source.commercial_use_status <> 'allowed' or v_source.reuse_status <> 'allowed'
    or v_source.redistribution_status <> 'allowed' or v_source.cache_status <> 'allowed'
    or v_source.source_stage not in ('FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW')
    or v_source.last_terms_checked_at is null or v_source.last_terms_checked_at>now()
    or nullif(btrim(v_source.attribution_requirement),'') is null
    or v_source.update_frequency_minutes is null
    or v_source.update_frequency_minutes not between 15 and 525600 then
      raise exception 'R36_SOURCE_NOT_APPROVED';
  end if;
  if p_expected_hash = p_new_hash then
    raise exception 'R36_IDENTICAL_CONTENT_HASH';
  end if;
  select * into v_before from public.events where id=p_event_id for update;
  if not found or v_before.source_id <> p_source_id
    or v_before.source_event_key is distinct from p_source_event_key
    or v_before.verification_status <> 'verified'
    or v_before.publication_status <> 'published' then
      raise exception 'R36_CANONICAL_EVENT_NOT_VERIFIED';
  end if;
  if p_status_evidence_url is not null and p_status_evidence_url is distinct from v_before.official_url then
    raise exception 'R36_STATUS_URL_MISMATCH';
  end if;
  select * into v_record from public.event_source_records
    where source_id=p_source_id and source_event_key=p_source_event_key and event_id=p_event_id for update;
  if not found or v_record.content_hash is distinct from p_expected_hash
    or v_record.source_url is distinct from v_before.official_url then
      raise exception 'R36_CONCURRENT_OR_PROVENANCE_MISMATCH';
  end if;
  -- Do not allow automatic changes to recurring/irregular schedules before the
  -- occurrence ledger has been independently reconciled.
  if v_before.schedule_type in ('recurring','irregular') and (p_patch ? 'start_date' or p_patch ? 'end_date' or p_patch ? 'event_status') then
    raise exception 'R36_RECURRENCE_REQUIRES_REVIEW';
  end if;
  update public.events set
    title=case when p_patch ? 'title' then p_patch->>'title' else title end,
    start_date=case when p_patch ? 'start_date' then (p_patch->>'start_date')::date else start_date end,
    end_date=case when p_patch ? 'end_date' then (p_patch->>'end_date')::date else end_date end,
    venue_name=case when p_patch ? 'venue_name' then p_patch->>'venue_name' else venue_name end,
    price_type=case when p_patch ? 'price_type' then p_patch->>'price_type' else price_type end,
    event_status=case when p_patch ? 'event_status' then p_patch->>'event_status' else event_status end,
    updated_at=now()
   where id=p_event_id returning * into v_after;
  -- Events and provenance are updated within this same function transaction.
  update public.event_source_records set
    content_hash=p_new_hash,
    source_title=v_after.title,
    source_start_date=v_after.start_date,
    source_end_date=v_after.end_date,
    source_venue_name=v_after.venue_name,
    updated_at=now()
  where id=v_record.id;
  select array_agg(key order by key) into v_changed from jsonb_object_keys(p_patch) as key;
  insert into public.machiibe_nonprod_event_change_audit(
   event_id,source_id,source_event_key,previous_hash,next_hash,changed_fields,before_snapshot,after_snapshot
  )values(p_event_id,p_source_id,p_source_event_key,p_expected_hash,p_new_hash,coalesce(v_changed,'{}'::text[]),
  jsonb_build_object('title',v_before.title,'start_date',v_before.start_date,'end_date',v_before.end_date,'venue_name',v_before.venue_name,'event_status',v_before.event_status),
  jsonb_build_object('title',v_after.title,'start_date',v_after.start_date,'end_date',v_after.end_date,'venue_name',v_after.venue_name,'event_status',v_after.event_status));
  return query select v_after.id,v_record.id,p_expected_hash,p_new_hash;
end $$;

revoke all on function public.machiibe_nonprod_apply_existing_event_r36(bigint,bigint,text,text,text,jsonb,text,timestamptz)
 from public,anon,authenticated;
grant execute on function public.machiibe_nonprod_apply_existing_event_r36(bigint,bigint,text,text,text,jsonb,text,timestamptz)
 to service_role;
