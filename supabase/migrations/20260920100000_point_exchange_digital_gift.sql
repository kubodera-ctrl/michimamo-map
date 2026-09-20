-- Development 31: Digital Gift based point exchange foundation.
-- Beta remains hard-closed in both settings and RPCs.

create schema if not exists app_private;

create table public.point_exchange_settings (
  id boolean primary key default true check (id),
  exchange_enabled boolean not null default false,
  processing_enabled boolean not null default false,
  provider_key text not null default 'digital_gift',
  rate_points integer not null default 1000 check (rate_points > 0),
  rate_yen integer not null default 100 check (rate_yen > 0),
  terms_version text not null default 'beta-2026-09-20',
  guardian_consent_version text not null default 'beta-2026-09-20',
  updated_at timestamptz not null default now()
);

create table public.point_exchange_options (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  required_points integer not null check (required_points > 0),
  face_value_yen integer not null check (face_value_yen > 0),
  enabled boolean not null default true,
  display_order integer not null default 0,
  campaign_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.point_exchange_providers (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  name text not null check (char_length(name) between 1 and 100),
  logo_url text,
  enabled boolean not null default true,
  display_order integer not null default 0,
  notice text,
  status text not null default 'planned' check (status in ('planned','approved','disabled')),
  updated_at timestamptz not null default now(),
  check (logo_url is null or (status = 'approved' and logo_url ~ '^https://'))
);

create table public.point_exchange_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  option_id text not null references public.point_exchange_options(id),
  provider_key text not null default 'digital_gift',
  points integer not null check (points > 0),
  face_value_yen integer not null check (face_value_yen > 0),
  status text not null check (status in (
    'requested','points_reserved','approved','issuing','issued',
    'issue_failed','cancelled','rejected'
  )),
  idempotency_key uuid not null,
  is_minor boolean not null default false,
  guardian_consent_confirmed boolean not null default false,
  guardian_consent_method text,
  guardian_consent_version text,
  terms_version text not null,
  external_issue_id text,
  failure_reason text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  issuing_at timestamptz,
  issued_at timestamptz,
  points_committed_at timestamptz,
  cancelled_at timestamptz,
  unique (user_id, idempotency_key),
  check (not is_minor or guardian_consent_confirmed)
);

create unique index point_exchange_requests_external_issue_uidx
  on public.point_exchange_requests(provider_key, external_issue_id)
  where external_issue_id is not null;
create index point_exchange_requests_user_requested_idx
  on public.point_exchange_requests(user_id, requested_at desc);
create index point_exchange_requests_status_requested_idx
  on public.point_exchange_requests(status, requested_at desc);
create index point_exchange_requests_active_reservations_idx
  on public.point_exchange_requests(user_id, status)
  where status in ('requested','points_reserved','approved','issuing');

create table app_private.point_exchange_deliveries (
  request_id uuid primary key references public.point_exchange_requests(id) on delete cascade,
  provider_key text not null,
  external_issue_id text not null,
  claim_url text not null check (claim_url ~ '^https://'),
  delivered_at timestamptz not null default now(),
  unique(provider_key, external_issue_id)
);

create table app_private.point_exchange_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.point_exchange_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  reason text,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
create index point_exchange_events_request_created_idx
  on app_private.point_exchange_events(request_id, created_at);

alter table public.point_exchange_settings enable row level security;
alter table public.point_exchange_options enable row level security;
alter table public.point_exchange_providers enable row level security;
alter table public.point_exchange_requests enable row level security;

revoke all on table public.point_exchange_settings from anon, authenticated;
revoke all on table public.point_exchange_options from anon, authenticated;
revoke all on table public.point_exchange_providers from anon, authenticated;
revoke all on table public.point_exchange_requests from anon, authenticated;
revoke all on table app_private.point_exchange_deliveries from public, anon, authenticated;
revoke all on table app_private.point_exchange_events from public, anon, authenticated;

insert into public.point_exchange_settings(id) values(true)
on conflict(id) do nothing;

insert into public.point_exchange_options(id,required_points,face_value_yen,display_order)
values ('digital-gift-3000',30000,3000,10),('digital-gift-5000',50000,5000,20)
on conflict(id) do update set
  required_points=excluded.required_points,
  face_value_yen=excluded.face_value_yen,
  display_order=excluded.display_order,
  updated_at=now();

insert into public.point_exchange_providers(id,name,display_order,status,notice) values
  ('paypay-money-lite','PayPayマネーライト',10,'planned','出金不可などの条件は正式導入時の指定に従います'),
  ('amazon-gift-card','Amazonギフトカード',20,'planned',null),
  ('rakuten-point','楽天ポイント',30,'planned',null),
  ('d-point','dポイント',40,'planned',null),
  ('v-point-gift','Vポイントギフト',50,'planned',null),
  ('ponta-point','Pontaポイント',60,'planned',null),
  ('nanaco-gift','nanacoギフト',70,'planned',null),
  ('google-play-gift-code','Google Play ギフトコード',80,'planned',null),
  ('au-pay-gift-card','au PAY ギフトカード',90,'planned',null),
  ('waon-point-egift','WAON POINT eギフト',100,'planned',null),
  ('famipay-gift-code','FamiPayギフトコード',110,'planned',null),
  ('paypal','PayPal',120,'planned',null),
  ('seven-bank-atm','セブン銀行ATM',130,'planned',null),
  ('bank-transfer','銀行振込',140,'planned',null)
on conflict(id) do update set name=excluded.name,display_order=excluded.display_order,notice=excluded.notice,updated_at=now();

create or replace function public.get_point_exchange_catalog()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'beta', not s.exchange_enabled,
    'enabled', s.exchange_enabled,
    'providerKey', s.provider_key,
    'rate', jsonb_build_object('points',s.rate_points,'yen',s.rate_yen),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'requiredPoints',o.required_points,'faceValueYen',o.face_value_yen,
        'enabled',o.enabled,'displayOrder',o.display_order,'campaignLabel',o.campaign_label
      ) order by o.display_order,o.required_points)
      from public.point_exchange_options o
      where o.enabled and (o.starts_at is null or o.starts_at <= now())
        and (o.ends_at is null or o.ends_at > now())
    ),'[]'::jsonb),
    'providers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.name,'logoUrl',p.logo_url,'enabled',p.enabled,
        'displayOrder',p.display_order,'notice',p.notice,'status',p.status
      ) order by p.display_order,p.name)
      from public.point_exchange_providers p where p.enabled and p.status <> 'disabled'
    ),'[]'::jsonb)
  )
  from public.point_exchange_settings s where s.id;
$$;

create or replace function public.get_my_point_exchange_history()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'requestedAt',r.requested_at,'points',r.points,
      'faceValueYen',r.face_value_yen,'method','digital_gift','status',r.status,
      'issuedAt',r.issued_at,
      'claimUrl',case when r.status='issued' then d.claim_url else null end
    ) order by r.requested_at desc)
    from public.point_exchange_requests r
    left join app_private.point_exchange_deliveries d on d.request_id=r.id
    where r.user_id=v_user_id
  ),'[]'::jsonb);
end;
$$;

create or replace function public.request_point_exchange(
  p_option_id text,
  p_idempotency_key uuid,
  p_guardian_confirmation jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_setting public.point_exchange_settings%rowtype;
  v_option public.point_exchange_options%rowtype;
  v_balance integer;
  v_reserved bigint;
  v_request public.point_exchange_requests%rowtype;
  v_is_minor boolean := coalesce((p_guardian_confirmation->>'isMinor')::boolean,false);
  v_guardian_confirmed boolean := coalesce((p_guardian_confirmation->>'confirmed')::boolean,false);
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
  select * into v_setting from public.point_exchange_settings where id;
  if not coalesce(v_setting.exchange_enabled,false) then
    raise exception 'exchange_beta_closed' using errcode='55000';
  end if;
  if p_idempotency_key is null then raise exception 'idempotency_key_required' using errcode='22023'; end if;
  if v_is_minor and not v_guardian_confirmed then raise exception 'guardian_consent_required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text,3101));
  select * into v_request from public.point_exchange_requests
    where user_id=v_user_id and idempotency_key=p_idempotency_key;
  if found then
    return jsonb_build_object('id',v_request.id,'status',v_request.status,'idempotent',true);
  end if;
  select * into v_option from public.point_exchange_options
    where id=p_option_id and enabled and (starts_at is null or starts_at<=now())
      and (ends_at is null or ends_at>now()) for share;
  if not found then raise exception 'exchange_option_unavailable' using errcode='22023'; end if;
  select coalesce(point,0) into v_balance from public.profiles where auth_id=v_user_id for update;
  if not found then raise exception 'profile_not_found' using errcode='P0002'; end if;
  select coalesce(sum(points),0) into v_reserved from public.point_exchange_requests
    where user_id=v_user_id and status in ('requested','points_reserved','approved','issuing');
  if v_balance-v_reserved < v_option.required_points then raise exception 'insufficient_available_points' using errcode='22003'; end if;
  insert into public.point_exchange_requests(
    user_id,option_id,provider_key,points,face_value_yen,status,idempotency_key,
    is_minor,guardian_consent_confirmed,guardian_consent_method,guardian_consent_version,terms_version
  ) values (
    v_user_id,v_option.id,v_setting.provider_key,v_option.required_points,v_option.face_value_yen,
    'points_reserved',p_idempotency_key,v_is_minor,v_guardian_confirmed,
    nullif(left(coalesce(p_guardian_confirmation->>'method',''),40),''),
    case when v_is_minor then v_setting.guardian_consent_version else null end,v_setting.terms_version
  ) returning * into v_request;
  insert into app_private.point_exchange_events(request_id,from_status,to_status,action,actor_user_id)
  values(v_request.id,'requested','points_reserved','reserve_points',v_user_id);
  return jsonb_build_object('id',v_request.id,'status',v_request.status,'idempotent',false);
end;
$$;

create or replace function public.admin_list_point_exchanges(p_password text,p_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_validate(p_password);
  if p_status is not null and p_status not in ('requested','points_reserved','approved','issuing','issued','issue_failed','cancelled','rejected') then
    raise exception 'invalid_exchange_status' using errcode='22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'userId',r.user_id,'userName',p.name,'requestedAt',r.requested_at,
      'points',r.points,'faceValueYen',r.face_value_yen,'method','digital_gift',
      'status',r.status,'externalIssueId',r.external_issue_id,'issuedAt',r.issued_at,
      'failureReason',r.failure_reason
    ) order by r.requested_at desc)
    from public.point_exchange_requests r
    left join public.profiles p on p.auth_id=r.user_id
    where p_status is null or r.status=p_status
  ),'[]'::jsonb);
end;
$$;

create or replace function public.admin_transition_point_exchange(
  p_password text,
  p_request_id uuid,
  p_action text,
  p_external_issue_id text default null,
  p_claim_url text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_setting public.point_exchange_settings%rowtype;
  v_request public.point_exchange_requests%rowtype;
  v_from text;
  v_to text;
begin
  perform public.admin_validate(p_password);
  select * into v_setting from public.point_exchange_settings where id;
  if not coalesce(v_setting.processing_enabled,false) then
    raise exception 'exchange_processing_not_enabled' using errcode='55000';
  end if;
  select * into v_request from public.point_exchange_requests where id=p_request_id for update;
  if not found then raise exception 'exchange_request_not_found' using errcode='P0002'; end if;
  v_from:=v_request.status;
  if p_action='approve' and v_from='points_reserved' then v_to:='approved';
  elsif p_action='start_issuing' and v_from='approved' then v_to:='issuing';
  elsif p_action='mark_failed' and v_from='issuing' then v_to:='issue_failed';
  elsif p_action='retry' and v_from='issue_failed' then v_to:='approved';
  elsif p_action in ('cancel','reject') and v_from in ('points_reserved','approved','issue_failed') then
    v_to:=case when p_action='reject' then 'rejected' else 'cancelled' end;
  elsif p_action='mark_issued' and v_from='issuing' then v_to:='issued';
  else raise exception 'invalid_exchange_transition' using errcode='22023';
  end if;
  if p_action='retry' then
    perform pg_advisory_xact_lock(hashtextextended(v_request.user_id::text,3101));
    if (select coalesce(point,0) from public.profiles where auth_id=v_request.user_id)
       - (select coalesce(sum(points),0) from public.point_exchange_requests where user_id=v_request.user_id and status in ('requested','points_reserved','approved','issuing'))
       < v_request.points then raise exception 'insufficient_available_points' using errcode='22003'; end if;
  end if;
  if v_to='issued' then
    if nullif(trim(coalesce(p_external_issue_id,'')),'') is null or p_claim_url !~ '^https://' then
      raise exception 'issued_delivery_required' using errcode='22023';
    end if;
    if v_request.points_committed_at is null then
      perform public.apply_point_transaction(v_request.user_id,-v_request.points,'point_exchange',v_request.id::text);
    end if;
    insert into app_private.point_exchange_deliveries(request_id,provider_key,external_issue_id,claim_url)
    values(v_request.id,v_request.provider_key,p_external_issue_id,p_claim_url)
    on conflict(request_id) do update set
      external_issue_id=excluded.external_issue_id,claim_url=excluded.claim_url,delivered_at=now();
  end if;
  update public.point_exchange_requests set
    status=v_to,updated_at=now(),
    approved_at=case when v_to='approved' then now() else approved_at end,
    issuing_at=case when v_to='issuing' then now() else issuing_at end,
    issued_at=case when v_to='issued' then now() else issued_at end,
    points_committed_at=case when v_to='issued' then coalesce(points_committed_at,now()) else points_committed_at end,
    cancelled_at=case when v_to in ('cancelled','rejected') then now() else cancelled_at end,
    external_issue_id=case when v_to='issued' then p_external_issue_id else external_issue_id end,
    failure_reason=case when v_to='issue_failed' then nullif(left(trim(coalesce(p_reason,'')),1000),'') else null end
  where id=p_request_id;
  insert into app_private.point_exchange_events(request_id,from_status,to_status,action,reason,actor_user_id)
  values(p_request_id,v_from,v_to,p_action,nullif(left(trim(coalesce(p_reason,'')),1000),''),auth.uid());
  insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
  values('point_exchange_'||p_action,'point_exchange',p_request_id::text,jsonb_build_object('from',v_from,'to',v_to),auth.uid());
  return jsonb_build_object('id',p_request_id,'status',v_to);
end;
$$;

revoke all on function public.get_point_exchange_catalog() from public;
revoke all on function public.get_my_point_exchange_history() from public;
revoke all on function public.request_point_exchange(text,uuid,jsonb) from public;
revoke all on function public.admin_list_point_exchanges(text,text) from public;
revoke all on function public.admin_transition_point_exchange(text,uuid,text,text,text,text) from public;
grant execute on function public.get_point_exchange_catalog() to authenticated;
grant execute on function public.get_my_point_exchange_history() to authenticated;
grant execute on function public.request_point_exchange(text,uuid,jsonb) to authenticated;
grant execute on function public.admin_list_point_exchanges(text,text) to authenticated;
grant execute on function public.admin_transition_point_exchange(text,uuid,text,text,text,text) to authenticated;

comment on table public.point_exchange_requests is 'Point reservations and Digital Gift exchange lifecycle; no payout account identifiers are stored.';
comment on column public.point_exchange_providers.logo_url is 'Only approved, contract-provided brand assets may be configured.';
comment on function public.request_point_exchange(text,uuid,jsonb) is 'Hard-stops while exchange_enabled=false; later reserves points without mutating the point ledger.';
comment on function public.admin_transition_point_exchange(text,uuid,text,text,text,text) is 'Provider-neutral state transition endpoint. Hard-stops while processing_enabled=false.';
