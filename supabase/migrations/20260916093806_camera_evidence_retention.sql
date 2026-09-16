create table public.camera_evidence (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 spot_id bigint references public.spots(id) on delete set null,
 purpose text not null default 'road_parking' check(purpose='road_parking'),
 object_path text unique,
 state text not null default 'upload_pending' check(state in ('upload_pending','active','preserved','decision_due','delete_queued','delete_failed','deleted')),
 content_type text check(content_type is null or content_type in ('image/jpeg','image/webp')),
 byte_size integer check(byte_size is null or byte_size between 1 and 8388608),
 sha256 text check(sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
 width integer check(width is null or width between 320 and 4096),
 height integer check(height is null or height between 320 and 4096),
 privacy_confirmed boolean not null default false,
 created_at timestamptz not null default now(),
 upload_expires_at timestamptz not null default (now()+interval '1 hour'),
 finalized_at timestamptz,
 normal_delete_at timestamptz,
 preserve_until timestamptz,
 decision_due_at timestamptz,
 preserve_reason text check(preserve_reason is null or length(preserve_reason) between 10 and 500),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 delete_reason text,
 delete_requested_at timestamptz,
 cleanup_token uuid,
 cleanup_locked_until timestamptz,
 deletion_attempts integer not null default 0 check(deletion_attempts between 0 and 100),
 deletion_error_code text,
 deleted_at timestamptz,
 check((state='upload_pending' and finalized_at is null and normal_delete_at is null) or state<>'upload_pending'),
 check(state not in ('active','preserved','decision_due') or (finalized_at is not null and normal_delete_at is not null and privacy_confirmed)),
 check(state<>'preserved' or preserve_until is not null),
 check(state<>'decision_due' or decision_due_at is not null)
);
comment on table public.camera_evidence is '非公開の駐停車証拠画像。通常10日、管理者保全30日、満了後7日回答待ち。画像・識別情報は削除完了時に消去。';
alter table public.camera_evidence enable row level security;
revoke all on public.camera_evidence from public,anon,authenticated;
grant select on public.camera_evidence to authenticated;
create policy camera_evidence_owner_admin_read on public.camera_evidence for select to authenticated
 using(user_id=(select auth.uid()) or (select public.is_current_user_admin()));
create index camera_evidence_user_created_idx on public.camera_evidence(user_id,created_at desc) where user_id is not null;
create index camera_evidence_due_idx on public.camera_evidence(state,coalesce(decision_due_at,preserve_until,normal_delete_at,upload_expires_at));
create index camera_evidence_spot_idx on public.camera_evidence(spot_id) where spot_id is not null;

create table app_private.camera_evidence_audit (
 id bigint generated always as identity primary key,
 evidence_id uuid not null,
 action text not null check(action in ('prepared','finalized','preserved','decision_due','extended','delete_requested','delete_failed','deleted')),
 actor_id uuid,
 reason_code text,
 created_at timestamptz not null default now()
);
alter table app_private.camera_evidence_audit enable row level security;
revoke all on app_private.camera_evidence_audit from public,anon,authenticated;
create policy camera_evidence_audit_client_deny on app_private.camera_evidence_audit for all to anon,authenticated using(false) with check(false);
create index camera_evidence_audit_evidence_idx on app_private.camera_evidence_audit(evidence_id,created_at desc);

create table app_private.camera_cleanup_control (
 task text primary key,
 last_started_at timestamptz,
 last_finished_at timestamptz
);
alter table app_private.camera_cleanup_control enable row level security;
revoke all on app_private.camera_cleanup_control from public,anon,authenticated;
create policy camera_cleanup_control_client_deny on app_private.camera_cleanup_control for all to anon,authenticated using(false) with check(false);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('camera-evidence','camera-evidence',false,8388608,array['image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create function public.prepare_camera_evidence(p_spot_id bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e public.camera_evidence%rowtype; n integer;
begin
 if u is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if not public.is_user_active(u) then raise exception 'account_suspended' using errcode='42501'; end if;
 if p_spot_id is not null and not exists(select 1 from public.spots where id=p_spot_id and created_by=u) then raise exception 'spot_not_owned'; end if;
 perform pg_advisory_xact_lock(hashtextextended('camera_evidence:'||u::text,0));
 select count(*) into n from public.camera_evidence where user_id=u and created_at>=date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
 if n>=50 then raise exception 'daily_upload_limit'; end if;
 if (select count(*) from public.camera_evidence where user_id=u and state='upload_pending' and upload_expires_at>now())>=5 then raise exception 'pending_upload_limit'; end if;
 insert into public.camera_evidence(user_id,spot_id) values(u,p_spot_id) returning * into e;
 update public.camera_evidence set object_path=u::text||'/'||e.id::text||'/original.jpg' where id=e.id returning * into e;
 insert into app_private.camera_evidence_audit(evidence_id,action,actor_id) values(e.id,'prepared',u);
 return jsonb_build_object('id',e.id,'object_path',e.object_path,'upload_expires_at',e.upload_expires_at,'max_bytes',8388608,'allowed_types',jsonb_build_array('image/jpeg','image/webp'));
end $$;
revoke all on function public.prepare_camera_evidence(bigint) from public,anon,authenticated;
grant execute on function public.prepare_camera_evidence(bigint) to authenticated;

create function public.finalize_camera_evidence(p_id uuid,p_sha256 text,p_width integer,p_height integer,p_privacy_confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e public.camera_evidence%rowtype; o storage.objects%rowtype; bytes bigint; mime text;
begin
 if u is null then raise exception 'authentication_required' using errcode='28000'; end if;
 select * into e from public.camera_evidence where id=p_id and user_id=u for update;
 if not found then raise exception 'evidence_not_found'; end if;
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

create function public.request_my_camera_evidence_deletion(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); changed integer;
begin
 if u is null then raise exception 'authentication_required' using errcode='28000'; end if;
 update public.camera_evidence set state='delete_queued',delete_reason='owner_request',delete_requested_at=now(),cleanup_token=null,cleanup_locked_until=null
 where id=p_id and user_id=u and state<>'deleted';get diagnostics changed=row_count;
 if changed=0 then raise exception 'evidence_not_found'; end if;
 insert into app_private.camera_evidence_audit(evidence_id,action,actor_id,reason_code) values(p_id,'delete_requested',u,'owner_request');
 return true;
end $$;
revoke all on function public.request_my_camera_evidence_deletion(uuid) from public,anon,authenticated;
grant execute on function public.request_my_camera_evidence_deletion(uuid) to authenticated;

create function app_private.camera_evidence_admin_operation(p_action text,p_payload jsonb)
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
   update public.camera_evidence set state='preserved',preserve_until=greatest(coalesce(preserve_until,normal_delete_at,now()),now())+interval '30 days',
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
create function public.admin_camera_evidence(p_password text,p_action text default 'list',p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='28000'; end if;
 perform public.admin_validate(p_password);
 return app_private.camera_evidence_admin_operation(p_action,p_payload);
end $$;
revoke all on function public.admin_camera_evidence(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_camera_evidence(text,text,jsonb) to authenticated;

create function public.camera_evidence_cleanup_batch(p_limit integer default 50)
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
 with moved as (update public.camera_evidence set state='decision_due',decision_due_at=now()+interval '7 days',cleanup_token=null,cleanup_locked_until=null
   where state='preserved' and preserve_until<=now() returning id)
 insert into app_private.camera_evidence_audit(evidence_id,action,reason_code) select id,'decision_due','preservation_expired' from moved;
 update public.camera_evidence set state='delete_queued',delete_reason='preservation_no_response',delete_requested_at=now()
   where state='decision_due' and decision_due_at<=now();
 with claimed as (
   select id from public.camera_evidence where state in ('delete_queued','delete_failed') and object_path is not null
     and (cleanup_locked_until is null or cleanup_locked_until<=now()) order by delete_requested_at nulls first,created_at for update skip locked limit p_limit
 ), updated as (
   update public.camera_evidence c set cleanup_token=token,cleanup_locked_until=now()+interval '5 minutes',deletion_attempts=deletion_attempts+1,deletion_error_code=null
   from claimed where c.id=claimed.id returning c.id,c.object_path
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',object_path)),'[]'::jsonb) into result from updated;
 return jsonb_build_object('token',token,'items',result,'throttled',false);
end $$;
revoke all on function public.camera_evidence_cleanup_batch(integer) from public,anon,authenticated;
grant execute on function public.camera_evidence_cleanup_batch(integer) to service_role;

create function public.camera_evidence_cleanup_result(p_id uuid,p_token uuid,p_success boolean,p_error_code text default null)
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
 insert into app_private.camera_evidence_audit(evidence_id,action,reason_code) values(p_id,action_name,case when p_success then null else p_error_code end);
 return true;
end $$;
revoke all on function public.camera_evidence_cleanup_result(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.camera_evidence_cleanup_result(uuid,uuid,boolean,text) to service_role;

create function public.camera_evidence_cleanup_finished()
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if current_user not in ('service_role','postgres') then raise exception 'service_role_required' using errcode='42501'; end if;
 update app_private.camera_cleanup_control set last_finished_at=now() where task='retention';return true;
end $$;
revoke all on function public.camera_evidence_cleanup_finished() from public,anon,authenticated;
grant execute on function public.camera_evidence_cleanup_finished() to service_role;

create policy camera_evidence_insert on storage.objects for insert to authenticated with check(
 bucket_id='camera-evidence' and exists(select 1 from public.camera_evidence c where c.object_path=name and c.user_id=(select auth.uid()) and c.state='upload_pending' and c.upload_expires_at>now())
);
create policy camera_evidence_owner_admin_read on storage.objects for select to authenticated using(
 bucket_id='camera-evidence' and exists(select 1 from public.camera_evidence c where c.object_path=name and (c.user_id=(select auth.uid()) or (select public.is_current_user_admin())) and c.state not in ('delete_queued','delete_failed','deleted'))
);
