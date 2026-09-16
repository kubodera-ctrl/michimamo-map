begin;
-- The request receipt survives removal of the account; its reason and user link are cleared.
alter table public.account_deletion_requests alter column user_id drop not null;
alter table public.account_deletion_requests drop constraint account_deletion_requests_user_id_fkey;
alter table public.account_deletion_requests add constraint account_deletion_requests_user_id_fkey
 foreign key(user_id) references auth.users(id) on delete set null;
create table public.account_deletion_jobs (
 id uuid primary key default gen_random_uuid(),
 request_id bigint not null unique references public.account_deletion_requests(id),
 user_id uuid,
 status text not null default 'cleaning' check(status in ('cleaning','db_cleaned','completed')),
 started_by uuid references auth.users(id) on delete set null,
 started_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.account_deletion_jobs enable row level security;
revoke all on public.account_deletion_jobs from public,anon,authenticated;
create policy account_deletion_jobs_internal on public.account_deletion_jobs for all to anon,authenticated using(false) with check(false);
create index account_deletion_jobs_user_idx on public.account_deletion_jobs(user_id) where user_id is not null;
create index account_deletion_jobs_actor_idx on public.account_deletion_jobs(started_by);

-- Old JWTs must not regain upload/write access after the moderation row cascades away.
create or replace function public.is_user_active(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select p_user_id is not null and exists(select 1 from auth.users where id=p_user_id)
 and not exists(select 1 from public.user_moderation where user_id=p_user_id and status='suspended')
 and not exists(select 1 from public.account_deletion_jobs where user_id=p_user_id and status<>'completed');
$$;

create function app_private.admin_begin_account_deletion(p_password text,p_request_id bigint)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.account_deletion_requests%rowtype; j public.account_deletion_jobs%rowtype;
begin
 perform public.admin_validate(p_password);
 select * into r from public.account_deletion_requests where id=p_request_id for update;
 if not found then raise exception 'deletion_request_missing' using errcode='P0002'; end if;
 select * into j from public.account_deletion_jobs where request_id=r.id;
 if found then return jsonb_build_object('jobId',j.id,'userId',j.user_id,'status',j.status); end if;
 if r.status not in ('pending','processing') or r.user_id is null then raise exception 'deletion_request_not_active' using errcode='P0001'; end if;
 if r.user_id=auth.uid() or exists(select 1 from public.admin_users where user_id=r.user_id) then
  raise exception 'admin_account_requires_manual_handover' using errcode='42501'; end if;
 -- Never delete another user's object because its URL was placed in this user's post.
 if exists(select 1 from public.spots s join storage.objects o
   on o.bucket_id='spot-images' and s.image_url like '%/storage/v1/object/public/spot-images/'||o.name
   where s.created_by=r.user_id and o.owner_id is distinct from r.user_id::text
   and o.owner is distinct from r.user_id and split_part(o.name,'/',1)<>r.user_id::text) then
  raise exception 'legacy_photo_ownership_review_required' using errcode='P0001'; end if;
 perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,2202));
 insert into public.account_deletion_jobs(request_id,user_id,started_by) values(r.id,r.user_id,auth.uid()) returning * into j;
 insert into public.user_moderation(user_id,status,reason) values(r.user_id,'suspended','退会処理中')
 on conflict(user_id) do update set status='suspended',reason='退会処理中',updated_at=now();
 update public.account_deletion_requests set status='processing',updated_at=now() where id=r.id;
 insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
 values('deletion_started','deletion_request',r.id::text,jsonb_build_object('job_id',j.id),auth.uid());
 return jsonb_build_object('jobId',j.id,'userId',j.user_id,'status',j.status);
end$$;
create function public.admin_begin_account_deletion(p_password text,p_request_id bigint)
returns jsonb language sql security invoker set search_path='' as $$select app_private.admin_begin_account_deletion(p_password,p_request_id)$$;

create function app_private.account_deletion_photo_batch(p_job_id uuid)
returns table(bucket_id text,name text) language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid;
begin
 select user_id into u from public.account_deletion_jobs where id=p_job_id and status<>'completed';
 if u is null then return; end if;
 return query select o.bucket_id,o.name from storage.objects o
 where o.owner_id=u::text or o.owner=u or (o.bucket_id in ('spot-images','aed-submission-images') and split_part(o.name,'/',1)=u::text)
 order by o.bucket_id,o.name limit 100;
end$$;
create function public.account_deletion_photo_batch(p_job_id uuid)
returns table(bucket_id text,name text) language sql security invoker set search_path='' as $$select * from app_private.account_deletion_photo_batch(p_job_id)$$;

create function app_private.account_deletion_clean_data(p_job_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.account_deletion_jobs%rowtype; u uuid;
begin
 select * into j from public.account_deletion_jobs where id=p_job_id for update;
 if not found then raise exception 'deletion_job_missing'; end if;
 if j.status in ('db_cleaned','completed') then return; end if;
 u:=j.user_id;
 if u is null or exists(select 1 from public.admin_users where user_id=u) then raise exception 'invalid_deletion_target'; end if;
 if exists(select 1 from app_private.account_deletion_photo_batch(j.id)) then raise exception 'photos_remaining'; end if;
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
create function public.account_deletion_clean_data(p_job_id uuid)
returns void language sql security invoker set search_path='' as $$select app_private.account_deletion_clean_data(p_job_id)$$;

create function app_private.account_deletion_complete(p_job_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.account_deletion_jobs%rowtype;
begin
 select * into j from public.account_deletion_jobs where id=p_job_id for update;
 if not found then raise exception 'deletion_job_missing'; end if;
 if j.status='completed' then return; end if;
 if j.status<>'db_cleaned' or exists(select 1 from auth.users where id=j.user_id) then raise exception 'auth_deletion_not_complete'; end if;
 update public.account_deletion_requests set status='completed',user_id=null,reason=null,updated_at=now() where id=j.request_id;
 update public.account_deletion_jobs set status='completed',user_id=null,updated_at=now(),completed_at=now() where id=j.id;
 insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
 values('deletion_completed','deletion_request',j.request_id::text,jsonb_build_object('job_id',j.id),j.started_by);
end$$;
create function public.account_deletion_complete(p_job_id uuid)
returns void language sql security invoker set search_path='' as $$select app_private.account_deletion_complete(p_job_id)$$;

create or replace function public.admin_update_deletion_request(p_password text,p_request_id bigint,p_status text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.admin_validate(p_password);
 if p_status is null or p_status not in ('processing','cancelled') then raise exception 'use_deletion_execution_for_completion'; end if;
 perform 1 from public.account_deletion_requests where id=p_request_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if exists(select 1 from public.account_deletion_jobs where request_id=p_request_id) then raise exception 'deletion_already_started_resume_required'; end if;
 update public.account_deletion_requests set status=p_status,updated_at=now() where id=p_request_id and status in ('pending','processing');
 if not found then raise exception 'request_not_active'; end if;
 insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
 values('deletion_'||p_status,'deletion_request',p_request_id::text,'{}',auth.uid());
 return true;
end$$;

revoke all on function app_private.admin_begin_account_deletion(text,bigint),public.admin_begin_account_deletion(text,bigint) from public,anon,authenticated;
grant execute on function app_private.admin_begin_account_deletion(text,bigint),public.admin_begin_account_deletion(text,bigint) to authenticated;
revoke all on function app_private.account_deletion_photo_batch(uuid),public.account_deletion_photo_batch(uuid),
 app_private.account_deletion_clean_data(uuid),public.account_deletion_clean_data(uuid),
 app_private.account_deletion_complete(uuid),public.account_deletion_complete(uuid) from public,anon,authenticated;
grant execute on function app_private.account_deletion_photo_batch(uuid),public.account_deletion_photo_batch(uuid),
 app_private.account_deletion_clean_data(uuid),public.account_deletion_clean_data(uuid),
 app_private.account_deletion_complete(uuid),public.account_deletion_complete(uuid) to service_role;
-- Serialize account-owned writes with deletion start, including requests using old JWTs.
create function app_private.guard_account_deletion() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := (to_jsonb(new)->>tg_argv[0])::uuid;
begin
 if u is not null then
  perform pg_advisory_xact_lock(hashtextextended(u::text,2202));
  if exists(select 1 from public.account_deletion_jobs where user_id=u and status<>'completed') then
   raise exception 'account_deletion_in_progress' using errcode='42501';
  end if;
 end if;
 return new;
end$$;
revoke all on function app_private.guard_account_deletion() from public,anon,authenticated;
do $$
declare t text; c text;
begin
 for t,c in select * from (values
  ('profiles','auth_id'),('spots','created_by'),('aed_submissions','user_id'),
  ('aed_lifecycle_reports','reporter_user_id'),('spot_votes','user_id'),
  ('point_transactions','user_id'),('quiz_claims','user_id'),('gacha_results','user_id'),
  ('point_balance_baselines','user_id'),('line_notification_preferences','user_id'),
  ('moderation_appeals','user_id'),('auth_identities_michimamo','auth_id'),('auth_exchange_codes','auth_id')
 ) as x(t,c) loop
  execute format('create trigger guard_account_deletion before insert or update on public.%I for each row execute function app_private.guard_account_deletion(%L)',t,c);
 end loop;
end$$;
commit;
