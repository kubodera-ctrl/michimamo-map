create table public.aed_image_checks (
 submission_id uuid primary key references public.aed_submissions(id) on delete cascade,
 status text not null check(status in ('running','completed','failed')),
 request_id uuid not null,
 result jsonb, error_code text, model text,
 requested_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.aed_image_checks enable row level security;
revoke all on public.aed_image_checks from public,anon,authenticated;
grant select on public.aed_image_checks to authenticated;
grant all on public.aed_image_checks to service_role;
create policy aed_image_checks_admin_read on public.aed_image_checks for select to authenticated
 using ((select public.is_current_user_admin()));
create table app_private.aed_ai_daily_usage (day date primary key, attempts integer not null);
alter table app_private.aed_ai_daily_usage enable row level security;
revoke all on app_private.aed_ai_daily_usage from public,anon,authenticated;
grant usage on schema app_private to service_role;
grant all on app_private.aed_ai_daily_usage to service_role;
-- Service role only; caller identity and admin password are checked by the Edge Function first.
create function public.reserve_aed_image_check(p_submission_id uuid,p_admin_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.aed_image_checks%rowtype; d date:=(now() at time zone 'Asia/Tokyo')::date; n integer; token uuid:=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtextextended('aed_image_ai',0));
 if not exists(select 1 from public.admin_users where user_id=p_admin_id and is_active) then raise exception 'admin_required'; end if;
 if not exists(select 1 from public.aed_submissions where id=p_submission_id and status in ('pending','needs_review','needs_changes')) then raise exception 'submission_not_pending'; end if;
 select * into r from public.aed_image_checks where submission_id=p_submission_id;
 if r.status='completed' then return jsonb_build_object('cached',true,'result',r.result); end if;
 if r.updated_at>now()-interval '2 minutes' then raise exception 'ai_retry_later'; end if;
 insert into app_private.aed_ai_daily_usage(day,attempts) values(d,0) on conflict do nothing;
 select attempts into n from app_private.aed_ai_daily_usage where day=d for update;
 if n>=100 then raise exception 'ai_daily_limit'; end if;
 update app_private.aed_ai_daily_usage set attempts=attempts+1 where day=d;
 delete from app_private.aed_ai_daily_usage where day<d-7;
 insert into public.aed_image_checks(submission_id,status,request_id,requested_by)
 values(p_submission_id,'running',token,p_admin_id)
 on conflict(submission_id) do update set status='running',request_id=excluded.request_id,
 requested_by=excluded.requested_by,result=null,error_code=null,model=null,updated_at=now();
 return jsonb_build_object('cached',false,'request_id',token);
end $$;
revoke all on function public.reserve_aed_image_check(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_aed_image_check(uuid,uuid) to service_role;
