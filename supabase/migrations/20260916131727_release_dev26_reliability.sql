-- Development 26: replay-safe writes, active-account checks and deletion hygiene.
begin;
create table app_private.spot_submission_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, payload_hash text not null, spot_id bigint,
 awarded integer not null, created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table app_private.spot_submission_receipts enable row level security;
revoke all on app_private.spot_submission_receipts from public,anon,authenticated;

create or replace function public.award_spot_post_points() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 -- Lock BEFORE counting; the point balance lock alone was too late.
 perform pg_advisory_xact_lock(hashtextextended(new.created_by::text,2202));
 select count(*) into n from public.point_transactions where user_id=new.created_by and reason='spot_post'
 and created_at >= date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
 if n<5 then perform public.apply_point_transaction(new.created_by,10,'spot_post',new.id::text); end if;
 return new;
end$$;

create function app_private.submit_spot_once(p_request_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r app_private.spot_submission_receipts%rowtype; sid bigint; pts integer;
 lat double precision; lng double precision; olat double precision; olng double precision; cat text; img text;
begin
 if u is null or not public.is_user_active(u) then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2202));
 select * into r from app_private.spot_submission_receipts where user_id=u and request_id=p_request_id;
 if found then
  if r.payload_hash<>md5(p_payload::text) then raise exception 'request_payload_mismatch'; end if;
  return jsonb_build_object('id',r.spot_id,'awarded',r.awarded,'replayed',true);
 end if;
 lat:=(p_payload->>'lat')::double precision;lng:=(p_payload->>'lng')::double precision;cat:=p_payload->>'category';img:=nullif(p_payload->>'image_url','');
 if lat is null or lng is null or not(lat between -90 and 90) or not(lng between -180 and 180)
 or cat is null or cat not in ('illegal','danger','patrol','abandoned','reckless')
 or length(trim(coalesce(p_payload->>'title',''))) not between 1 and 200
 or length(coalesce(p_payload->>'comment',''))>2000 then raise exception 'invalid_post'; end if;
 if p_payload->>'source'='camera' then
  olat:=(p_payload->>'origin_lat')::double precision;olng:=(p_payload->>'origin_lng')::double precision;
  if olat is null or olng is null or not(olat between -90 and 90) or not(olng between -180 and 180)
    or cat in ('abandoned') or img is not null then raise exception 'invalid_camera_post'; end if;
  if 6371000*2*asin(sqrt(least(1.0,power(sin(radians(lat-olat)/2),2)+cos(radians(lat))*cos(radians(olat))*power(sin(radians(lng-olng)/2),2))))>50 then raise exception 'camera_location_outside_50m'; end if;
 elsif p_payload->>'source' is distinct from 'map' then raise exception 'invalid_source'; end if;
 if img is not null and (cat<>'abandoned' or not exists(select 1 from storage.objects o where o.bucket_id='spot-images'
 and split_part(o.name,'/',1)=u::text and img='https://ckftozjhdszlwqnylmxv.supabase.co/storage/v1/object/public/spot-images/'||o.name)) then raise exception 'owned_photo_required'; end if;
 if cat='abandoned' and img is null then raise exception 'photo_required'; end if;
 insert into public.spots(lat,lng,category,title,comment,image_url,address,created_by)
 values(lat,lng,cat,p_payload->>'title',p_payload->>'comment',img,left(coalesce(p_payload->>'address','不明なエリア'),200),u) returning id into sid;
 select coalesce(sum(amount),0) into pts from public.point_transactions where user_id=u and reason='spot_post' and ref_key=sid::text;
 insert into app_private.spot_submission_receipts(user_id,request_id,payload_hash,spot_id,awarded) values(u,p_request_id,md5(p_payload::text),sid,pts);
 return jsonb_build_object('id',sid,'awarded',pts,'replayed',false);
end$$;
create function public.submit_spot_once(p_request_id uuid,p_payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$select app_private.submit_spot_once(p_request_id,p_payload)$$;
revoke all on function app_private.submit_spot_once(uuid,jsonb),public.submit_spot_once(uuid,jsonb) from public,anon,authenticated;
grant execute on function app_private.submit_spot_once(uuid,jsonb),public.submit_spot_once(uuid,jsonb) to authenticated;
-- All current normal posts now pass validation and idempotency through the RPC.
revoke insert on public.spots from authenticated;

alter table public.camera_evidence add column request_id uuid;
create unique index camera_evidence_request_idx on public.camera_evidence(request_id) where request_id is not null;

create function app_private.prepare_camera_evidence_once(p_spot_id bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e public.camera_evidence%rowtype; n integer;
begin
 if u is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if not public.is_user_active(u) then raise exception 'account_suspended' using errcode='42501'; end if;
 if p_spot_id is not null and not exists(select 1 from public.spots where id=p_spot_id and created_by=u) then raise exception 'spot_not_owned'; end if;
 perform pg_advisory_xact_lock(hashtextextended('camera_evidence:'||u::text,0));
 if p_request_id is null then raise exception 'request_id_required'; end if;
 if exists(select 1 from public.camera_evidence where request_id=p_request_id and (state='deleted' or user_id is distinct from u)) then raise exception 'evidence_request_unavailable'; end if;
 select * into e from public.camera_evidence where user_id=u and request_id=p_request_id;
 if found then
  if e.spot_id is distinct from p_spot_id then raise exception 'request_payload_mismatch'; end if;
  if e.state='upload_pending' and e.upload_expires_at<=now() and e.created_at>now()-interval '10 days' then
   update public.camera_evidence set upload_expires_at=now()+interval '1 hour' where id=e.id;
  end if;
  return jsonb_build_object('id',e.id,'object_path',e.object_path,'state',e.state);
 end if;
 select count(*) into n from public.camera_evidence where user_id=u and created_at>=date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
 if n>=50 then raise exception 'daily_upload_limit'; end if;
 if (select count(*) from public.camera_evidence where user_id=u and state='upload_pending' and upload_expires_at>now())>=5 then raise exception 'pending_upload_limit'; end if;
 insert into public.camera_evidence(user_id,spot_id,request_id) values(u,p_spot_id,p_request_id) returning * into e;
 update public.camera_evidence set object_path=u::text||'/'||e.id::text||'/original.jpg' where id=e.id returning * into e;
 insert into app_private.camera_evidence_audit(evidence_id,action,actor_id) values(e.id,'prepared',u);
 return jsonb_build_object('id',e.id,'object_path',e.object_path,'upload_expires_at',e.upload_expires_at,'max_bytes',8388608,'allowed_types',jsonb_build_array('image/jpeg','image/webp'));
end $$;
create function public.prepare_camera_evidence_once(p_spot_id bigint,p_request_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.prepare_camera_evidence_once(p_spot_id,p_request_id)$$;
revoke all on function app_private.prepare_camera_evidence_once(bigint,uuid),public.prepare_camera_evidence_once(bigint,uuid) from public,anon,authenticated;
grant execute on function app_private.prepare_camera_evidence_once(bigint,uuid),public.prepare_camera_evidence_once(bigint,uuid) to authenticated;


create or replace function public.finalize_camera_evidence(p_id uuid,p_sha256 text,p_width integer,p_height integer,p_privacy_confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e public.camera_evidence%rowtype; o storage.objects%rowtype; bytes bigint; mime text;
begin
 if u is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if not public.is_user_active(u) then raise exception 'account_suspended' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2202));
 select * into e from public.camera_evidence where id=p_id and user_id=u for update;
 if not found then raise exception 'evidence_not_found'; end if;
 if e.state in ('active','preserved','decision_due') and e.sha256=p_sha256 and e.width=p_width and e.height=p_height and p_privacy_confirmed is true then
  return jsonb_build_object('id',e.id,'state',e.state,'delete_at',e.normal_delete_at);
 end if;
 if e.state<>'upload_pending' or e.upload_expires_at<=now() then raise exception 'upload_expired'; end if;
 if p_privacy_confirmed is distinct from true then raise exception 'privacy_confirmation_required'; end if;
 if p_sha256 is null or p_sha256!~'^[0-9a-f]{64}$' or p_width not between 320 and 4096 or p_height not between 320 and 4096 then raise exception 'invalid_image_metadata'; end if;
 select * into o from storage.objects where bucket_id='camera-evidence' and name=e.object_path;
 if not found then raise exception 'upload_not_found'; end if;
 bytes:=coalesce((o.metadata->>'size')::bigint,0);mime:=coalesce(o.metadata->>'mimetype','');
 if bytes<1 or bytes>8388608 or mime not in ('image/jpeg','image/webp') then raise exception 'invalid_uploaded_file'; end if;
 update public.camera_evidence set state='active',content_type=mime,byte_size=bytes,sha256=p_sha256,width=p_width,height=p_height,
  privacy_confirmed=true,finalized_at=now(),normal_delete_at=now()+interval '10 days',deletion_error_code=null where id=e.id;
 insert into app_private.camera_evidence_audit(evidence_id,action,actor_id) values(e.id,'finalized',u);
 return jsonb_build_object('id',e.id,'state','active','delete_at',now()+interval '10 days');
end $$;
revoke all on function public.finalize_camera_evidence(uuid,text,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.finalize_camera_evidence(uuid,text,integer,integer,boolean) to authenticated;


create or replace function public.camera_evidence_cleanup_batch(p_limit integer default 50)
returns jsonb language plpgsql security definer set search_path='' as $$
declare token uuid:=gen_random_uuid(); result jsonb; started timestamptz;
begin
 if current_user not in ('service_role','postgres') then raise exception 'service_role_required' using errcode='42501'; end if;
 if p_limit not between 1 and 100 then raise exception 'invalid_limit'; end if;
 perform pg_advisory_xact_lock(hashtextextended('camera_evidence_cleanup',0));
 insert into app_private.camera_cleanup_control(task) values('retention') on conflict do nothing;
 select last_started_at into started from app_private.camera_cleanup_control where task='retention' for update;
 if started>now()-interval '15 minutes' then return jsonb_build_object('token',token,'items','[]'::jsonb,'throttled',true); end if;
 update app_private.camera_cleanup_control set last_started_at=now() where task='retention';
 update public.camera_evidence set state='delete_queued',delete_reason='upload_timeout',delete_requested_at=now() where state='upload_pending' and upload_expires_at<=now();
 update public.camera_evidence set state='delete_queued',delete_reason='normal_retention_expired',delete_requested_at=now() where state='active' and normal_delete_at<=now();
 with moved as (update public.camera_evidence set state='decision_due',decision_due_at=preserve_until+interval '7 days',cleanup_token=null,cleanup_locked_until=null
   where state='preserved' and preserve_until<=now() returning id)
 insert into app_private.camera_evidence_audit(evidence_id,action,reason_code) select id,'decision_due','preservation_expired' from moved;
 update public.camera_evidence set state='delete_queued',delete_reason='preservation_no_response',delete_requested_at=now()
   where state='decision_due' and decision_due_at<=now();
 with claimed as (
   select id from public.camera_evidence where state in ('delete_queued','delete_failed') and object_path is not null
     and (cleanup_locked_until is null or cleanup_locked_until<=now()) order by delete_requested_at nulls first,created_at for update skip locked limit p_limit
 ), updated as (
   update public.camera_evidence c set cleanup_token=token,cleanup_locked_until=now()+interval '5 minutes',deletion_attempts=least(deletion_attempts+1,100),deletion_error_code=null
   from claimed where c.id=claimed.id returning c.id,c.object_path
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',object_path)),'[]'::jsonb) into result from updated;
 return jsonb_build_object('token',token,'items',result,'throttled',false);
end $$;
revoke all on function public.camera_evidence_cleanup_batch(integer) from public,anon,authenticated;
grant execute on function public.camera_evidence_cleanup_batch(integer) to service_role;


create or replace function app_private.account_deletion_clean_data(p_job_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.account_deletion_jobs%rowtype; u uuid;
begin
 select * into j from public.account_deletion_jobs where id=p_job_id for update;
 if not found then raise exception 'deletion_job_missing'; end if;
 if j.status in ('db_cleaned','completed') then return; end if;
 u:=j.user_id;
 if u is null or exists(select 1 from public.admin_users where user_id=u) then raise exception 'invalid_deletion_target'; end if;
 if exists(select 1 from app_private.account_deletion_photo_batch(j.id)) then raise exception 'photos_remaining'; end if;
 -- Storage API has already removed every owned object. Scrub the later-added camera tables.
 update app_private.camera_evidence_audit set actor_id=null where actor_id=u or evidence_id in (select id from public.camera_evidence where user_id=u);
 update public.camera_evidence set state='deleted',user_id=null,spot_id=null,object_path=null,request_id=null,
 content_type=null,byte_size=null,sha256=null,width=null,height=null,privacy_confirmed=false,
 preserve_reason=null,reviewed_by=null,delete_reason='account_deleted',cleanup_token=null,cleanup_locked_until=null,
 deletion_error_code=null,deleted_at=now() where user_id=u;
 delete from app_private.spot_submission_receipts where user_id=u;
 -- Retain verified facility facts, sever the link to the removed submission/account.
 update public.safety_spots ss set source_key='withdrawn-user-aed:'||ss.id::text,source_url='/',source_external_id=null,updated_at=now()
 where ss.source_key in (select 'user-aed:'||s.id::text from public.aed_submissions s where s.user_id=u);
 delete from public.admin_audit_log l where (l.target_type='user' and l.target_id=u::text)
  or (l.target_type='spot' and l.target_id in(select id::text from public.spots where created_by=u))
  or (l.target_type='aed_submission' and l.target_id in(select id::text from public.aed_submissions where user_id=u))
  or (l.target_type='appeal' and l.target_id in(select id::text from public.moderation_appeals where user_id=u));
 update public.moderation_appeals set reviewed_by=null where reviewed_by=u and user_id<>u;
 update public.admin_audit_log set actor_user_id=null where actor_user_id=u;
 update public.admin_users set created_by=null where created_by=u;
 update public.aed_import_batches set created_by=null where created_by=u;
 update public.point_fraud_alerts set reviewed_by=null where reviewed_by=u;
 update public.aed_lifecycle_reports set reviewed_by=null where reviewed_by=u and reporter_user_id is distinct from u;
 update public.aed_submissions set reviewed_by=null where reviewed_by=u and user_id<>u;
 delete from public.moderation_appeals where user_id=u;
 update public.aed_submissions set duplicate_of_submission_id=null
  where user_id<>u and duplicate_of_submission_id in(select id from public.aed_submissions where user_id=u);
 delete from public.aed_submission_rewards where user_id=u;
 delete from public.aed_lifecycle_reports where reporter_user_id=u;
 delete from public.aed_submissions where user_id=u;
 delete from public.spots where created_by=u;
 delete from public.spot_votes where user_id=u;
 delete from public.point_transactions where user_id=u;
 delete from public.quiz_claims where user_id=u;
 delete from public.gacha_results where user_id=u;
 delete from public.point_fraud_alerts where user_id=u;
 delete from public.point_balance_baselines where user_id=u;
 delete from public.line_notification_preferences where user_id=u;
 delete from public.profiles where auth_id=u;
 -- Auth identities are kept until Auth Admin API deletes the user, preventing re-link races.
 update public.account_deletion_requests set reason=null,updated_at=now() where user_id=u;
 update public.account_deletion_jobs set status='db_cleaned',updated_at=now() where id=j.id;
end$$;

create or replace function public.is_current_user_admin() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid() is not null and public.is_user_active(auth.uid()) and exists(select 1 from public.admin_users where user_id=auth.uid() and is_active=true);
$$;
create trigger guard_account_deletion before insert on public.camera_evidence for each row execute function app_private.guard_account_deletion('user_id');
create or replace function app_private.camera_evidence_admin_operation(p_action text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare e public.camera_evidence%rowtype; v_id uuid; v_reason text; v_result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if not public.is_current_user_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_action not in ('list','preserve','extend','delete') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_request'; end if;
 if p_action='list' then
   select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(x) order by x.deadline asc),'[]'::jsonb),'due_count',count(*) filter(where x.state='decision_due')) into v_result
   from (select c.id,c.spot_id,c.state,c.created_at,c.finalized_at,c.normal_delete_at,c.preserve_until,c.decision_due_at,
       coalesce(c.decision_due_at,c.preserve_until,c.normal_delete_at,c.upload_expires_at) deadline,c.preserve_reason,c.deletion_attempts,c.deletion_error_code,
       c.width,c.height,c.byte_size,c.content_type,c.object_path
     from public.camera_evidence c where c.state<>'deleted' order by deadline asc limit 100) x;
   return v_result;
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
revoke all on function app_private.camera_evidence_admin_operation(text,jsonb) from public,anon,authenticated;
drop policy camera_evidence_insert on storage.objects;
create policy camera_evidence_insert on storage.objects for insert to authenticated with check(
 bucket_id='camera-evidence' and public.is_user_active((select auth.uid())) and exists(
 select 1 from public.camera_evidence c where c.object_path=name and c.user_id=(select auth.uid()) and c.state='upload_pending' and c.upload_expires_at>now()));
create or replace function public.camera_evidence_cleanup_result(p_id uuid,p_token uuid,p_success boolean,p_error_code text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer; action_name text;
begin
 if current_user not in ('service_role','postgres') then raise exception 'service_role_required' using errcode='42501'; end if;
 if p_success then
   update public.camera_evidence set state='deleted',user_id=null,spot_id=null,object_path=null,content_type=null,byte_size=null,sha256=null,width=null,height=null,
    preserve_reason=null,reviewed_by=null,cleanup_token=null,cleanup_locked_until=null,deletion_error_code=null,deleted_at=now()
    where id=p_id and cleanup_token=p_token and state in ('delete_queued','delete_failed');action_name:='deleted';
 else
   if p_error_code is null or p_error_code not in ('storage_delete_failed','storage_object_remaining') then raise exception 'invalid_error_code'; end if;
   update public.camera_evidence set state='delete_failed',cleanup_token=null,cleanup_locked_until=null,deletion_error_code=p_error_code
    where id=p_id and cleanup_token=p_token and state in ('delete_queued','delete_failed');action_name:='delete_failed';
 end if;
 get diagnostics changed=row_count;if changed=0 then raise exception 'cleanup_claim_invalid'; end if;
 if p_success then update app_private.camera_evidence_audit set actor_id=null where evidence_id=p_id; end if;
 insert into app_private.camera_evidence_audit(evidence_id,action,reason_code) values(p_id,action_name,case when p_success then null else p_error_code end);
 return true;
end $$;
revoke all on function public.camera_evidence_cleanup_result(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.camera_evidence_cleanup_result(uuid,uuid,boolean,text) to service_role;

commit;
