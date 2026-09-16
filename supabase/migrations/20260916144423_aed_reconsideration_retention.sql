-- No backfill: existing decisions retain their prior policy. New replies start seven days.
alter table public.aed_submissions add column reconsider_until timestamptz,
 add column cleanup_started_at timestamptz;
create index aed_reconsider_expiry_idx on public.aed_submissions(reconsider_until)
 where status in ('rejected','needs_changes');
create table app_private.aed_expired_receipts (
 submission_id uuid primary key, deleted_at timestamptz not null default now()
);
create table app_private.aed_cleanup_jobs (
 submission_id uuid primary key references public.aed_submissions(id) on delete cascade,
 token uuid not null, leased_until timestamptz not null, attempts integer not null default 1,
 error_code text
);
alter table app_private.aed_expired_receipts enable row level security;
alter table app_private.aed_cleanup_jobs enable row level security;
revoke all on app_private.aed_expired_receipts,app_private.aed_cleanup_jobs from public,anon,authenticated;
grant all on app_private.aed_expired_receipts,app_private.aed_cleanup_jobs to service_role;

create function app_private.aed_reconsider_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if exists(select 1 from app_private.aed_expired_receipts where submission_id=new.id) then
   raise exception 'submission_expired' using errcode='23505';
  end if;
  if new.photo_object_path<>new.user_id::text||'/'||new.id::text||'.jpg' then raise exception 'owned_photo_required' using errcode='42501'; end if;
  new.reconsider_until:=null;new.cleanup_started_at:=null;
 elsif old.cleanup_started_at is not null and
       (new.status is distinct from old.status or new.reviewed_at is distinct from old.reviewed_at) then
  raise exception 'submission_expired' using errcode='42501';
 elsif new.status in ('rejected','needs_changes') and
       (new.status is distinct from old.status or new.reviewed_at is distinct from old.reviewed_at) then
  new.reconsider_until:=coalesce(new.reviewed_at,now())+interval '7 days';
 elsif new.status not in ('rejected','needs_changes') then new.reconsider_until:=null;
 end if;
 return new;
end$$;
revoke all on function app_private.aed_reconsider_guard() from public,anon,authenticated;
create trigger aed_reconsider_guard before insert or update on public.aed_submissions
 for each row execute function app_private.aed_reconsider_guard();

alter table public.moderation_appeals drop constraint moderation_appeals_user_id_target_type_target_id_key;
create unique index moderation_appeals_spot_once on public.moderation_appeals(user_id,target_type,target_id)
 where target_type='spot';
create unique index moderation_appeals_one_pending on public.moderation_appeals(user_id,target_type,target_id)
 where status='pending';

create or replace function app_private.submit_moderation_appeal(p_target_type text,p_target_id text,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); a uuid; original text; notes text; deadline timestamptz; deleting timestamptz;
begin
 if u is null or not public.is_user_active(u) then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_reason is null or length(trim(p_reason)) not between 10 and 1000 then raise exception 'reason_length' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2201));
 if p_target_type='aed_submission' then
  p_target_id := p_target_id::uuid::text;
  select status,review_notes,reconsider_until,cleanup_started_at into original,notes,deadline,deleting from public.aed_submissions
    where id=p_target_id::uuid and user_id=u and status in ('rejected','needs_changes') for update;
  if deleting is not null or deadline <= now() then raise exception 'reconsideration_expired' using errcode='42501'; end if;
 elsif p_target_type='spot' then
  p_target_id := p_target_id::bigint::text;
  select 'hidden',null::text into original,notes from public.spots
    where id=p_target_id::bigint and created_by=u and (is_hidden or report_count>=3) for update;
 else raise exception 'invalid_target' using errcode='22023'; end if;
 if original is null then raise exception 'appeal_target_unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.moderation_appeals where user_id=u and target_type=p_target_type and target_id=p_target_id and (p_target_type='spot' or status='pending')) then
  raise exception 'appeal_already_submitted' using errcode='23505'; end if;
 if (select count(*) from public.moderation_appeals where user_id=u and created_at>now()-interval '24 hours')>=3 then
  raise exception 'appeal_daily_limit' using errcode='P0001'; end if;
 insert into public.moderation_appeals(user_id,target_type,target_id,reason,original_decision,original_notes)
 values(u,p_target_type,p_target_id,trim(p_reason),original,notes) returning id into a;
 return a;
end$$;

create or replace function app_private.admin_resolve_moderation_appeal(p_password text,p_appeal_id uuid,p_outcome text,p_response text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.moderation_appeals%rowtype;
begin
 perform public.admin_validate(p_password);
 if p_outcome is null or p_outcome not in ('reconsider','maintain') or p_response is null or length(trim(p_response)) not between 5 and 1000 then
  raise exception 'invalid_resolution' using errcode='22023'; end if;
 -- Lock the submission first, matching submit/cleanup lock order.
 select * into a from public.moderation_appeals where id=p_appeal_id;
 if a.target_type='aed_submission' then
  perform 1 from public.aed_submissions where id=a.target_id::uuid for update;
 end if;
 select * into a from public.moderation_appeals where id=p_appeal_id for update;
 if not found or a.status<>'pending' then raise exception 'appeal_already_resolved_or_missing' using errcode='P0001'; end if;
 if p_outcome='reconsider' then
  if a.target_type='aed_submission' then
   update public.aed_submissions set status='needs_review',updated_at=now()
    where id=a.target_id::uuid and user_id=a.user_id and status in ('rejected','needs_changes');
   if not found then raise exception 'target_state_changed' using errcode='P0001'; end if;
  else
   -- Retain report votes/history. Admin unhide alone cannot bypass the 3-report display threshold.
   -- A report reset is logged with its previous count; existing vote records remain.
   insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
    select 'appeal_restore','spot',id::text,jsonb_build_object('previous_report_count',report_count,'appeal_id',a.id),auth.uid()
    from public.spots where id=a.target_id::bigint and created_by=a.user_id;
   update public.spots set is_hidden=false,report_count=0 where id=a.target_id::bigint and created_by=a.user_id;
   if not found then raise exception 'target_state_changed' using errcode='P0001'; end if;
  end if;
 end if;
 if a.target_type='aed_submission' and p_outcome='maintain' then
  update public.aed_submissions set reviewed_at=now(),review_notes=trim(p_response),reviewed_by=auth.uid(),updated_at=now()
   where id=a.target_id::uuid and user_id=a.user_id and status in ('rejected','needs_changes');
  if not found then raise exception 'target_state_changed'; end if;
 end if;
 update public.moderation_appeals set status='resolved',outcome=p_outcome,response=trim(p_response),reviewed_by=auth.uid(),reviewed_at=now()
  where id=a.id;
 insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
 values('appeal_'||p_outcome,'appeal',a.id::text,jsonb_build_object('target_type',a.target_type,'target_id',a.target_id),auth.uid());
end$$;

-- Service-only workers use invoker rights. No user-controlled ID or clock is accepted by claim.
create function public.aed_retention_claim(p_limit integer default 20) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.aed_submissions%rowtype; t uuid; items jsonb:='[]';
begin
 for s in select a.* from public.aed_submissions a
  left join app_private.aed_cleanup_jobs j on j.submission_id=a.id
  where a.status in ('rejected','needs_changes') and a.reconsider_until<=now()
   and (j.submission_id is null or j.leased_until<=now())
   and not exists(select 1 from public.moderation_appeals m where m.target_type='aed_submission' and m.target_id=a.id::text and m.status='pending')
   and not exists(select 1 from public.aed_submission_rewards r where r.submission_id=a.id)
   and not exists(select 1 from public.aed_lifecycle_reports r where r.photo_object_path=a.photo_object_path)
   and not exists(select 1 from public.safety_spots r where r.source_key='user-aed:'||a.id::text)
   and not exists(select 1 from public.account_deletion_requests r where r.user_id=a.user_id and r.status='processing')
  order by a.reconsider_until,a.id limit least(greatest(coalesce(p_limit,20),1),20)
  for update of a skip locked
 loop
  t:=gen_random_uuid();
  insert into app_private.aed_cleanup_jobs(submission_id,token,leased_until) values(s.id,t,now()+interval '10 minutes')
   on conflict(submission_id) do update set token=excluded.token,leased_until=excluded.leased_until,attempts=app_private.aed_cleanup_jobs.attempts+1,error_code=null;
  update public.aed_submissions set cleanup_started_at=coalesce(cleanup_started_at,now()) where id=s.id;
  items:=items||jsonb_build_array(jsonb_build_object('id',s.id,'userId',s.user_id,'path',s.photo_object_path,'token',t));
 end loop;
 return items;
end$$;
create function public.aed_retention_result(p_id uuid,p_token uuid,p_success boolean) returns text
language plpgsql security invoker set search_path='' as $$
declare s public.aed_submissions%rowtype; j app_private.aed_cleanup_jobs%rowtype;
begin
 select * into s from public.aed_submissions where id=p_id for update;
 if not found then
  if exists(select 1 from app_private.aed_expired_receipts where submission_id=p_id) then return 'deleted'; end if;
  return 'missing'; -- e.g. completed account deletion
 end if;
 select * into j from app_private.aed_cleanup_jobs where submission_id=p_id for update;
 if not found or j.token<>p_token then raise exception 'stale_cleanup_claim' using errcode='42501'; end if;
 if not coalesce(p_success,false) or exists(select 1 from storage.objects where bucket_id='aed-submission-images' and name=s.photo_object_path) then
  update app_private.aed_cleanup_jobs set error_code='storage_delete_unconfirmed',leased_until=now()+interval '1 hour' where submission_id=p_id;
  return 'retry';
 end if;
 if s.cleanup_started_at is null or s.status not in ('rejected','needs_changes') or s.reconsider_until is null or s.reconsider_until>now()
  or exists(select 1 from public.moderation_appeals where target_type='aed_submission' and target_id=p_id::text and status='pending')
  or exists(select 1 from public.aed_submission_rewards where submission_id=p_id)
  or exists(select 1 from public.aed_lifecycle_reports where photo_object_path=s.photo_object_path)
  or exists(select 1 from public.safety_spots where source_key='user-aed:'||p_id::text)
 then raise exception 'cleanup_state_changed'; end if;
 insert into app_private.aed_expired_receipts(submission_id) values(p_id) on conflict do nothing;
 delete from public.moderation_appeals where target_type='aed_submission' and target_id=p_id::text;
 update public.aed_submissions set duplicate_of_submission_id=null where duplicate_of_submission_id=p_id;
 delete from public.aed_submissions where id=p_id;
 insert into public.admin_audit_log(action,target_type,target_id,detail)
  values('aed_expired_cleanup','aed_submission',p_id::text,'{"reason":"seven_day_no_pending_reconsideration"}'::jsonb);
 return 'deleted';
end$$;
revoke all on function public.aed_retention_claim(integer),public.aed_retention_result(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.aed_retention_claim(integer),public.aed_retention_result(uuid,uuid,boolean) to service_role;

-- Prevent a stale client from uploading the deleted photo again, even before a DB insert.
create function app_private.aed_photo_upload_allowed(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare sid uuid;
begin
 if auth.uid() is null or split_part(p_name,'/',1)<>auth.uid()::text
  or p_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then return false; end if;
 begin sid:=replace(split_part(p_name,'/',2),'.jpg','')::uuid;
 exception when invalid_text_representation then return false;end;
 return not exists(select 1 from app_private.aed_expired_receipts where submission_id=sid)
  and not exists(select 1 from public.aed_submissions where id=sid and cleanup_started_at is not null);
end$$;
revoke all on function app_private.aed_photo_upload_allowed(text) from public,anon,authenticated;
grant execute on function app_private.aed_photo_upload_allowed(text) to authenticated;
alter policy aed_submission_images_owner_insert on storage.objects
 with check(bucket_id='aed-submission-images' and (storage.foldername(name))[1]=auth.uid()::text
  and public.is_user_active(auth.uid()) and app_private.aed_photo_upload_allowed(name));

-- Hourly scheduler; no new paid service or user-session dependency.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$begin
 if not exists(select 1 from vault.secrets where name='aed_retention_cron_token') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'aed_retention_cron_token','AED retention scheduler only');
 end if;
end$$;
create function app_private.aed_retention_authorize(p_token text) returns boolean
language sql stable security definer set search_path='' as $$
 select length(p_token)=64 and exists(select 1 from vault.decrypted_secrets
  where name='aed_retention_cron_token' and decrypted_secret=p_token);
$$;
create function public.aed_retention_authorize(p_token text) returns boolean
language sql stable security invoker set search_path='' as $$select app_private.aed_retention_authorize(p_token)$$;
revoke all on function app_private.aed_retention_authorize(text),public.aed_retention_authorize(text) from public,anon,authenticated;
grant execute on function app_private.aed_retention_authorize(text),public.aed_retention_authorize(text) to service_role;
create function app_private.invoke_aed_retention() returns bigint
language sql security definer set search_path='' as $$
 select net.http_post(
  url:='https://ckftozjhdszlwqnylmxv.supabase.co/functions/v1/aed-retention',
  headers:=jsonb_build_object('Content-Type','application/json','x-retention-token',
   (select decrypted_secret from vault.decrypted_secrets where name='aed_retention_cron_token')),
  body:='{}'::jsonb,timeout_milliseconds:=60000);
$$;
revoke all on function app_private.invoke_aed_retention() from public,anon,authenticated,service_role;
select cron.schedule('aed-retention-hourly','17 * * * *','select app_private.invoke_aed_retention()');
