-- REVIEW CANDIDATE / NOT APPLIED TO ANY DATABASE.
-- Integrates with existing MAP admin_validate(text), is_current_user_admin(), admin_audit_log.
-- Execute only in a separately approved nonProduction project after independent schema/ACL review.
-- No change to spots, points, LINE, existing user submissions, Cron, or production data.

create table if not exists public.police_official_release_gate (
  id boolean primary key default true check (id = true),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.police_official_release_gate(id,enabled) values (true,false)
  on conflict (id) do nothing;
alter table public.police_official_release_gate enable row level security;
revoke all on public.police_official_release_gate from public, anon, authenticated;

create table if not exists public.police_official_documents (
  id bigint generated always as identity primary key,
  dataset text not null check (dataset in ('mail','precursor','town_stats')),
  record_key text not null check (length(record_key) between 8 and 128),
  revision integer not null check (revision between 1 and 999999),
  source_url text not null,
  source_file_sha256 text not null check (source_file_sha256 ~ '^[0-9a-f]{64}$'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  period_year integer check (period_year between 2000 and 2100),
  period_month integer check (period_month between 1 and 12),
  source_status text not null default 'active' check (source_status in ('active','corrected','withdrawn')),
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  rights_status text not null default 'unverified' check (rights_status in ('unverified','verified','blocked')),
  source_id_verified boolean not null default false,
  is_fixture boolean not null default false,
  latest boolean not null default true,
  requires_review boolean not null default false,
  rights_evidence_url text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  imported_at timestamptz not null default now(),
  unique(dataset,record_key,revision),
  constraint official_publication_approval_gate check (
    review_status <> 'approved' or
    (rights_status='verified' and latest and not is_fixture and not requires_review
      and source_status in ('active','corrected') and (dataset <> 'mail' or source_id_verified))
  ),
  constraint official_publication_source check (
    (dataset='mail' and source_url = 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/') or
    (dataset='precursor' and source_url = 'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html') or
    (dataset='town_stats' and source_url = 'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html')
  ),
  constraint official_publication_period check (
    (dataset='mail' and period_year is null and period_month is null) or
    (dataset <> 'mail' and period_year is not null and period_month is not null)
  )
);
create unique index if not exists police_official_one_latest
  on public.police_official_documents(dataset,record_key) where latest;
create index if not exists police_official_review_index
  on public.police_official_documents(review_status,imported_at desc);
alter table public.police_official_documents enable row level security;
revoke all on public.police_official_documents from public, anon, authenticated;
-- service_role uses its existing bypass-RLS database authority. Never expose its key in browser.

create table if not exists public.police_official_review_audit (
  id bigint generated always as identity primary key,
  document_id bigint not null references public.police_official_documents(id),
  action text not null check (action in ('approve','reject','hide','enable','disable')),
  expected_hash text not null,
  actor_id uuid not null,
  reason text,
  rights_evidence_url text,
  changed_at timestamptz not null default now()
);
alter table public.police_official_review_audit enable row level security;
revoke all on public.police_official_review_audit from public, anon, authenticated;
-- Even owner-side application code must not rewrite/revoke audit history through regular DML.
create or replace function public.police_official_immutable_audit()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'police_official_review_audit is append-only';
end;$$;
drop trigger if exists police_official_audit_immutable on public.police_official_review_audit;
create trigger police_official_audit_immutable before update or delete on public.police_official_review_audit
  for each row execute function public.police_official_immutable_audit();

-- Service role is the ONLY role permitted to stage records. Each new version replaces
-- previous public version atomically. Duplicate revision+hash is not reinserted.
-- This trigger refuses pre-approval and invalidates previous published revisions.
create or replace function public.police_official_stage_guard()
returns trigger language plpgsql set search_path = '' as $$
declare previous public.police_official_documents%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.dataset||':'||new.record_key, 63031));
  select * into previous from public.police_official_documents
    where dataset=new.dataset and record_key=new.record_key and latest
    for update;
  if found then
    if new.revision <= previous.revision then
      raise exception 'stale/conflicting revision; exact duplicate must use ON CONFLICT DO NOTHING';
    end if;
    update public.police_official_documents set latest=false, review_status='pending',rights_status='unverified'
      where id=previous.id;
  end if;
  -- Never accept a pre-approved status from importer payload.
  new.review_status:='pending'; new.rights_status:='unverified'; new.latest:=true;
  new.reviewed_by:=null; new.reviewed_at:=null; new.rights_evidence_url:=null;
  return new;
end;$$;
drop trigger if exists police_official_stage_guard on public.police_official_documents;
create trigger police_official_stage_guard before insert on public.police_official_documents
  for each row execute function public.police_official_stage_guard();
-- Same exact revision replays are checked in police_stage_official_document RPC
-- before INSERT, under the same advisory transaction lock.

-- A single optional staging endpoint; POSTGREST grants limit it to service_role.
-- File handling, download validation, and SHA measurement occur OFFLINE first.
-- New revisions automatically make the previous public revision invisible.
create or replace function public.police_stage_official_document(p_document jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.police_official_documents%rowtype;
declare new_id bigint;
declare kind text;
declare key text;
declare rev integer;
declare digest text;
declare source_sha text;
declare canonical_url text;
declare body jsonb;
declare state text;
begin
  if p_document is null or jsonb_typeof(p_document)<>'object' then
    raise exception 'invalid_staged_document';
  end if;
  kind:=p_document->>'dataset';key:=p_document->>'record_key';
  if kind not in ('mail','precursor','town_stats') or length(coalesce(key,'')) not between 8 and 128 then
    raise exception 'invalid_source_identity';
  end if;
  rev:=(p_document->>'revision')::integer;
  digest:=p_document->>'content_hash';source_sha:=p_document->>'source_file_sha256';
  canonical_url:=p_document->>'source_url';body:=p_document->'payload';
  state:=coalesce(p_document->>'source_status','active');
  if rev is null or rev<1 or digest !~ '^[0-9a-f]{64}$' or source_sha !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(body)<>'object' or state not in ('active','corrected','withdrawn') then
    raise exception 'invalid_source_payload';
  end if;
  if kind='mail' and (body->>'source_id' is distinct from 'tokyo_mail_keishicho_opendata'
    or (body->>'location_precision' <> 'exact' and
      (body->>'latitude' is not null or body->>'longitude' is not null))) then
    raise exception 'unverified_mail_source_or_location';
  end if;
  if kind in ('precursor','town_stats') and jsonb_typeof(body->'records') <> 'array' then
    raise exception 'invalid_cumulative_records';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(kind||':'||key,63031));
  select * into old from public.police_official_documents
    where dataset=kind and record_key=key and latest for update;
  if found then
    if rev=old.revision and digest=old.content_hash and source_sha=old.source_file_sha256 then
      return jsonb_build_object('status','duplicate','document_id',old.id,'revision',rev);
    end if;
    if rev<=old.revision then raise exception 'stale_or_conflicting_revision';end if;
  end if;
  insert into public.police_official_documents(dataset,record_key,revision,source_url,source_file_sha256,
    content_hash,payload,period_year,period_month,source_status,source_id_verified,is_fixture,requires_review)
  values (kind,key,rev,canonical_url,source_sha,digest,body,
    (p_document->>'period_year')::integer,(p_document->>'period_month')::integer,
    state,coalesce((p_document->>'source_id_verified')::boolean,false),
    coalesce((p_document->>'is_fixture')::boolean,true),
    coalesce((p_document->>'requires_review')::boolean,true))
  returning id into new_id;
  return jsonb_build_object('status','staged_pending_review','document_id',new_id,'revision',rev);
end;$$;

-- All public publication is through read-only sanitized RPCs, not direct tables.
-- The global switch stays OFF until separate Production/Source ON approval.
create or replace function public.police_official_public_mail()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'schema_version',1,
    'source_id','tokyo_mail_keishicho_opendata',
    'last_success_at',max(d.imported_at),
    'records',coalesce(jsonb_agg(d.payload || jsonb_build_object(
      'review_status','approved','rights_status','verified','is_fixture',false,
      'source_id','tokyo_mail_keishicho_opendata','identity_verified',true
    )) filter (where d.id is not null),'[]'::jsonb))
  from public.police_official_documents d
  where d.dataset='mail' and d.latest and d.review_status='approved'
    and d.rights_status='verified' and d.source_id_verified and not d.is_fixture
    and not d.requires_review and d.source_status in ('active','corrected')
    and exists(select 1 from public.police_official_release_gate g where g.id and g.enabled)
$$;

create or replace function public.police_official_public_cumulative(p_dataset text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare chosen public.police_official_documents%rowtype;
declare rows jsonb;
begin
  if p_dataset not in ('precursor','town_stats') then
    raise exception 'invalid dataset';
  end if;
  -- Find newest period BEFORE checking approval; old approved data must not
  -- bypass a newer unreviewed correction or release.
  select * into chosen from public.police_official_documents
    where dataset=p_dataset and latest
    order by period_year desc,period_month desc,revision desc limit 1;
  if not found or chosen.review_status<>'approved' or chosen.rights_status<>'verified'
    or chosen.is_fixture or chosen.requires_review or chosen.source_status='withdrawn'
    or not exists(select 1 from public.police_official_release_gate g where g.id and g.enabled)
  then
    return jsonb_build_object('schema_version',1,'dataset',p_dataset,'publication_enabled',false,'releases','[]'::jsonb);
  end if;
  -- The importer must have already validated/counts/coordinates; DB also rejects
  -- coordinates in all cumulative rows, including changed or malformed revisions.
  if jsonb_typeof(chosen.payload->'records')<>'array' then
    raise exception 'invalid official cumulative records';
  end if;
  if exists(select 1 from jsonb_array_elements(chosen.payload->'records') r
            where r ? 'latitude' and r->>'latitude' is not null and r->>'latitude' <> ''
               or r ? 'longitude' and r->>'longitude' is not null and r->>'longitude' <> '')
  then
    raise exception 'coordinates not allowed for cumulative data';
  end if;
  select coalesce(jsonb_agg(r || jsonb_build_object('review_status','approved','rights_status','verified')),'[]'::jsonb)
    into rows from jsonb_array_elements(chosen.payload->'records') r;
  return jsonb_build_object(
    'schema_version',1,'dataset',p_dataset,'publication_enabled',true,
    'releases',jsonb_build_array(jsonb_build_object(
      'year',chosen.period_year,'through_month',chosen.period_month,'revision',chosen.revision,
      'review_status','approved','rights_status','verified','records',rows,
      'requires_review',false,'superseded',false
    ))
  );
end;$$;

-- Admin boundary follows existing MAP admin_validate(p_password) + auth user role.
create or replace function public.admin_get_police_official_review(p_password text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform public.admin_validate(p_password);
  if auth.uid() is null or not public.is_current_user_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  return jsonb_build_object('scope','police_official_review',
    'pending',(select count(*) from public.police_official_documents where latest and review_status='pending'),
    'corrections',(select count(*) from public.police_official_documents where latest and source_status in ('corrected','withdrawn')),
    'rights_pending',(select count(*) from public.police_official_documents where latest and rights_status<>'verified'),
    'area_only',(select count(*) from public.police_official_documents where latest and dataset='mail'
       and (payload->>'location_precision' is distinct from 'exact')),
    'enabled',(select enabled from public.police_official_release_gate where id=true),
    'queue',(
       select coalesce(jsonb_agg(jsonb_build_object(
         'id',q.id,'dataset',q.dataset,'title',left(coalesce(q.payload->>'title',
             q.dataset||' '||q.period_year::text||'-'||q.period_month::text),180),
         'review_status',q.review_status,'source_status',q.source_status,
         'content_hash',q.content_hash,'source_file_sha256',q.source_file_sha256,
         'source_url',q.source_url,'is_fixture',q.is_fixture,
         'source_id_verified',q.source_id_verified,'requires_review',q.requires_review
       )),'[]'::jsonb)
       from (select * from public.police_official_documents where latest and review_status='pending'
             order by imported_at desc,id desc limit 30) q
    )
  );
end;$$;

-- Reviewer can approve only a current, exact, source-verified version and a
-- manually validated license scope. `p_verified_source_sha256` must match input.
-- There is no 'approve all' and no ability to edit content through this function.
create or replace function public.admin_review_police_official(
  p_password text,p_document_id bigint,p_action text,p_expected_hash text,
  p_verified_source_sha256 text,p_rights_evidence_url text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.police_official_documents%rowtype;
declare actor uuid;
begin
  perform public.admin_validate(p_password);
  actor:=auth.uid();
  if actor is null or not public.is_current_user_admin() then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if p_action not in ('approve','reject','hide') then raise exception 'invalid_action'; end if;
  select * into d from public.police_official_documents where id=p_document_id for update;
  if not found or not d.latest or d.content_hash is distinct from p_expected_hash
    or d.source_file_sha256 is distinct from p_verified_source_sha256 then
    raise exception 'stale_or_invalid_document';
  end if;
  if p_action='approve' then
    if d.is_fixture or d.requires_review or d.source_status='withdrawn' or
      (d.dataset='mail' and not d.source_id_verified) then
      raise exception 'source_not_eligible_for_approval';
    end if;
    if (d.dataset='mail' and p_rights_evidence_url is distinct from
        'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy') or
       (d.dataset='precursor' and p_rights_evidence_url is distinct from
        'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html') or
       (d.dataset='town_stats' and p_rights_evidence_url is distinct from
        'https://catalog.data.metro.tokyo.lg.jp/dataset/t000022d1700000021') then
      raise exception 'license_scope_unconfirmed';
    end if;
    update public.police_official_documents set review_status='approved', rights_status='verified',
      rights_evidence_url=p_rights_evidence_url,reviewed_by=actor,reviewed_at=now() where id=d.id;
  else
    update public.police_official_documents set review_status='rejected',rights_status='blocked',
      reviewed_by=actor,reviewed_at=now() where id=d.id;
  end if;
  insert into public.police_official_review_audit(document_id,action,expected_hash,actor_id,reason,rights_evidence_url)
    values (d.id,p_action,d.content_hash,actor,left(coalesce(p_reason,''),250),p_rights_evidence_url);
  insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
    values ('police_official_'||p_action,'police_official_document',d.id::text,
      jsonb_build_object('dataset',d.dataset,'revision',d.revision,'sha256',d.content_hash),actor);
  return jsonb_build_object('scope','police_official_review','document_id',d.id,'action',p_action,'reviewed',true);
end;$$;

-- Never trust a renderer/JSON field to turn the global gate ON. This function is
-- deliberately NOT created; an owner-approved release must explicitly add an
-- authenticated/fail-closed release operation after Hosted proof.

revoke all on function public.police_stage_official_document(jsonb) from public,anon,authenticated;
grant execute on function public.police_stage_official_document(jsonb) to service_role;
revoke all on function public.police_official_public_mail() from public,anon,authenticated;
revoke all on function public.police_official_public_cumulative(text) from public,anon,authenticated;
revoke all on function public.admin_get_police_official_review(text) from public,anon,authenticated;
revoke all on function public.admin_review_police_official(text,bigint,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.police_official_public_mail() to anon,authenticated;
grant execute on function public.police_official_public_cumulative(text) to anon,authenticated;
grant execute on function public.admin_get_police_official_review(text) to authenticated;
grant execute on function public.admin_review_police_official(text,bigint,text,text,text,text,text) to authenticated;
grant select,insert,update,delete on table public.police_official_documents to service_role;
grant select,insert on table public.police_official_review_audit to service_role;
grant select,update on table public.police_official_release_gate to service_role;
grant usage,select on all sequences in schema public to service_role;
-- SECURITY REVIEW REQUIRED: check default privileges, table access, stage atomicity,
-- policy visibility, admin role checks and existing admin_audit_log grants in
-- an approved isolated non-production DB before any Production plan.
