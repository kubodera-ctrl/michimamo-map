-- Development 32: production scheduler + lightweight health for camera evidence retention.
create table if not exists app_private.camera_retention_nonces (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
revoke all on table app_private.camera_retention_nonces from public, anon, authenticated;

create or replace function public.camera_retention_authorize(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_ok boolean := false;
begin
  if current_user not in ('service_role','postgres') then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  delete from app_private.camera_retention_nonces where expires_at <= now();
  v_hash := encode(extensions.digest(p_token,'sha256'),'hex');
  delete from app_private.camera_retention_nonces
   where token_hash=v_hash and expires_at>now()
   returning true into v_ok;
  return coalesce(v_ok,false);
end $$;

revoke all on function public.camera_retention_authorize(text) from public, anon, authenticated;
grant execute on function public.camera_retention_authorize(text) to service_role;

create or replace function app_private.invoke_camera_retention()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32),'hex');
  v_request_id bigint;
begin
  delete from app_private.camera_retention_nonces where expires_at <= now();
  insert into app_private.camera_retention_nonces(token_hash,expires_at)
  values(encode(extensions.digest(v_token,'sha256'),'hex'),now()+interval '2 minutes');

  select net.http_post(
    url:='https://ckftozjhdszlwqnylmxv.supabase.co/functions/v1/camera-evidence-retention',
    headers:=jsonb_build_object('Content-Type','application/json','x-retention-token',v_token),
    body:='{}'::jsonb,
    timeout_milliseconds:=60000
  ) into v_request_id;
  return v_request_id;
end $$;

revoke all on function app_private.invoke_camera_retention() from public, anon, authenticated;

create or replace function app_private.camera_evidence_admin_operation(p_action text, p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  e public.camera_evidence%rowtype;
  v_id uuid;
  v_reason text;
  v_result jsonb;
  v_pending integer:=0;
  v_failed integer:=0;
  v_failed3 integer:=0;
  v_storage_bytes bigint:=0;
  v_last_started timestamptz;
  v_last_finished timestamptz;
  v_stale boolean:=false;
  v_warning boolean:=false;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not public.is_current_user_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_action not in ('list','preserve','extend','delete') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_request'; end if;

  if p_action='list' then
    select jsonb_build_object(
      'items',coalesce(jsonb_agg(to_jsonb(x) order by x.deadline asc),'[]'::jsonb),
      'due_count',count(*) filter(where x.state='decision_due')
    ) into v_result
    from (
      select c.id,c.spot_id,c.state,c.created_at,c.finalized_at,c.normal_delete_at,c.preserve_until,c.decision_due_at,
        coalesce(c.decision_due_at,c.preserve_until,c.normal_delete_at,c.upload_expires_at) deadline,
        c.preserve_reason,c.deletion_attempts,c.deletion_error_code,c.width,c.height,c.byte_size,c.content_type,c.object_path
      from public.camera_evidence c
      where c.state<>'deleted'
      order by deadline asc
      limit 100
    ) x;

    select
      count(*) filter(where state in ('delete_queued','delete_failed')),
      count(*) filter(where state='delete_failed'),
      count(*) filter(where state='delete_failed' and deletion_attempts>=3)
    into v_pending,v_failed,v_failed3
    from public.camera_evidence;

    select coalesce(sum(
      case when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end
    ),0)
    into v_storage_bytes
    from storage.objects o
    where o.bucket_id='camera-evidence';

    select last_started_at,last_finished_at into v_last_started,v_last_finished
    from app_private.camera_cleanup_control where task='retention';

    v_stale := v_last_finished is null or v_last_finished < now()-interval '2 hours';
    v_warning := v_pending>=20 or v_failed>=3 or v_failed3>=1 or v_storage_bytes>=524288000 or v_stale;

    return v_result || jsonb_build_object(
      'retention',jsonb_build_object(
        'lastStartedAt',v_last_started,
        'lastFinishedAt',v_last_finished,
        'pendingDelete',v_pending,
        'failedDelete',v_failed,
        'failed3Plus',v_failed3,
        'storageBytes',v_storage_bytes,
        'stale',v_stale,
        'warning',v_warning,
        'thresholds',jsonb_build_object(
          'pendingDelete',20,
          'failedDelete',3,
          'failed3Plus',1,
          'storageBytes',524288000,
          'staleHours',2
        )
      )
    );
  end if;

  v_id:=nullif(p_payload->>'id','')::uuid;
  select * into e from public.camera_evidence where id=v_id for update;
  if not found or e.state='deleted' then raise exception 'evidence_not_found'; end if;

  if p_action='preserve' then
    v_reason:=trim(coalesce(p_payload->>'reason',''));
    if length(v_reason) not between 10 and 500 or e.state not in ('active','preserved','decision_due') then raise exception 'preserve_reason_required'; end if;
    update public.camera_evidence set state='preserved',preserve_until=now()+interval '30 days',
      decision_due_at=null,preserve_reason=v_reason,reviewed_by=auth.uid(),reviewed_at=now(),cleanup_token=null,cleanup_locked_until=null where id=v_id;
    insert into app_private.camera_evidence_audit(evidence_id,action,actor_id,reason_code) values(v_id,'preserved',auth.uid(),'admin_preserve');
  elsif p_action='extend' then
    v_reason:=trim(coalesce(p_payload->>'reason',e.preserve_reason,''));
    if e.state<>'decision_due' or length(v_reason) not between 10 and 500 then raise exception 'extension_not_due'; end if;
    update public.camera_evidence set state='preserved',preserve_until=now()+interval '30 days',decision_due_at=null,preserve_reason=v_reason,
      reviewed_by=auth.uid(),reviewed_at=now(),cleanup_token=null,cleanup_locked_until=null where id=v_id;
    insert into app_private.camera_evidence_audit(evidence_id,action,actor_id,reason_code) values(v_id,'extended',auth.uid(),'admin_extend');
  else
    update public.camera_evidence set state='delete_queued',delete_reason='admin_no_longer_needed',delete_requested_at=now(),reviewed_by=auth.uid(),reviewed_at=now(),cleanup_token=null,cleanup_locked_until=null where id=v_id;
    insert into app_private.camera_evidence_audit(evidence_id,action,actor_id,reason_code) values(v_id,'delete_requested',auth.uid(),'admin_no_longer_needed');
  end if;

  return jsonb_build_object('id',v_id,'action',p_action);
end $$;

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='camera-evidence-retention-hourly' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'camera-evidence-retention-hourly',
    '37 * * * *',
    'select app_private.invoke_camera_retention()'
  );
end $$;

do $$
begin
  if not exists(select 1 from cron.job where jobname='camera-evidence-retention-hourly' and active) then
    raise exception 'camera retention cron missing';
  end if;
  if has_function_privilege('anon','public.camera_retention_authorize(text)','EXECUTE')
     or has_function_privilege('authenticated','public.camera_retention_authorize(text)','EXECUTE') then
    raise exception 'camera retention authorize exposed';
  end if;
end $$;
