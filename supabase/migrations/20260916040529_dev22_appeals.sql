begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;
create table public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check(target_type in ('aed_submission','spot')),
  target_id text not null,
  reason text not null check(length(trim(reason)) between 10 and 1000),
  original_decision text not null,
  original_notes text,
  status text not null default 'pending' check(status in ('pending','resolved')),
  outcome text check(outcome in ('reconsider','maintain')),
  response text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(user_id,target_type,target_id)
);
alter table public.moderation_appeals enable row level security;
revoke all on public.moderation_appeals from public,anon,authenticated;
grant select on public.moderation_appeals to authenticated;
create policy moderation_appeals_owner_read on public.moderation_appeals
for select to authenticated using(user_id=(select auth.uid()));
create index moderation_appeals_pending_idx on public.moderation_appeals(created_at) where status='pending';
create index moderation_appeals_reviewer_idx on public.moderation_appeals(reviewed_by) where reviewed_by is not null;

create function app_private.submit_moderation_appeal(p_target_type text,p_target_id text,p_reason text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); a uuid; original text; notes text;
begin
 if u is null or not public.is_user_active(u) then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_reason is null or length(trim(p_reason)) not between 10 and 1000 then raise exception 'reason_length' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2201));
 if p_target_type='aed_submission' then
  p_target_id := p_target_id::uuid::text;
  select status,review_notes into original,notes from public.aed_submissions
    where id=p_target_id::uuid and user_id=u and status in ('rejected','needs_changes') for update;
 elsif p_target_type='spot' then
  p_target_id := p_target_id::bigint::text;
  select 'hidden',null::text into original,notes from public.spots
    where id=p_target_id::bigint and created_by=u and (is_hidden or report_count>=3) for update;
 else raise exception 'invalid_target' using errcode='22023'; end if;
 if original is null then raise exception 'appeal_target_unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.moderation_appeals where user_id=u and target_type=p_target_type and target_id=p_target_id) then
  raise exception 'appeal_already_submitted' using errcode='23505'; end if;
 if (select count(*) from public.moderation_appeals where user_id=u and created_at>now()-interval '24 hours')>=3 then
  raise exception 'appeal_daily_limit' using errcode='P0001'; end if;
 insert into public.moderation_appeals(user_id,target_type,target_id,reason,original_decision,original_notes)
 values(u,p_target_type,p_target_id,trim(p_reason),original,notes) returning id into a;
 return a;
end$$;
create function public.submit_moderation_appeal(p_target_type text,p_target_id text,p_reason text)
returns uuid language sql security invoker set search_path='' as $$select app_private.submit_moderation_appeal(p_target_type,p_target_id,p_reason)$$;

create function app_private.admin_get_moderation_appeals(p_password text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.admin_validate(p_password);
 return coalesce((select jsonb_agg(to_jsonb(x)) from (
  select a.*,p.name as user_name from public.moderation_appeals a left join public.profiles p on p.auth_id=a.user_id
  order by (a.status='pending') desc,a.created_at desc limit 100
 )x),'[]'::jsonb);
end$$;
create function public.admin_get_moderation_appeals(p_password text)
returns jsonb language sql security invoker set search_path='' as $$select app_private.admin_get_moderation_appeals(p_password)$$;

create function app_private.admin_resolve_moderation_appeal(p_password text,p_appeal_id uuid,p_outcome text,p_response text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.moderation_appeals%rowtype;
begin
 perform public.admin_validate(p_password);
 if p_outcome is null or p_outcome not in ('reconsider','maintain') or p_response is null or length(trim(p_response)) not between 5 and 1000 then
  raise exception 'invalid_resolution' using errcode='22023'; end if;
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
 update public.moderation_appeals set status='resolved',outcome=p_outcome,response=trim(p_response),reviewed_by=auth.uid(),reviewed_at=now()
  where id=a.id;
 insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id)
 values('appeal_'||p_outcome,'appeal',a.id::text,jsonb_build_object('target_type',a.target_type,'target_id',a.target_id),auth.uid());
end$$;
create function public.admin_resolve_moderation_appeal(p_password text,p_appeal_id uuid,p_outcome text,p_response text)
returns void language sql security invoker set search_path='' as $$select app_private.admin_resolve_moderation_appeal(p_password,p_appeal_id,p_outcome,p_response)$$;

revoke all on function app_private.submit_moderation_appeal(text,text,text),app_private.admin_get_moderation_appeals(text),
 app_private.admin_resolve_moderation_appeal(text,uuid,text,text),public.submit_moderation_appeal(text,text,text),
 public.admin_get_moderation_appeals(text),public.admin_resolve_moderation_appeal(text,uuid,text,text) from public,anon,authenticated;
grant execute on function app_private.submit_moderation_appeal(text,text,text),app_private.admin_get_moderation_appeals(text),
 app_private.admin_resolve_moderation_appeal(text,uuid,text,text),public.submit_moderation_appeal(text,text,text),
 public.admin_get_moderation_appeals(text),public.admin_resolve_moderation_appeal(text,uuid,text,text) to authenticated;
CREATE OR REPLACE FUNCTION public.get_my_dashboard()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
with me as(select auth.uid() uid),today_start as(select(date_trunc('day',now() at time zone 'Asia/Tokyo')at time zone 'Asia/Tokyo')ts)
select jsonb_build_object(
'today',jsonb_build_object(
'earned',coalesce((select sum(pt.amount)from public.point_transactions pt,me,today_start where pt.user_id=me.uid and pt.amount>0 and pt.created_at>=today_start.ts),0),
'postCount',coalesce((select count(*)from public.point_transactions pt,me,today_start where pt.user_id=me.uid and pt.reason='spot_post' and pt.created_at>=today_start.ts),0),
'quizClaimed',exists(select 1 from public.quiz_claims qc,me where qc.user_id=me.uid and qc.claim_date=(timezone('Asia/Tokyo',now()))::date),
'quizScore',coalesce((select qc.score from public.quiz_claims qc,me where qc.user_id=me.uid and qc.claim_date=(timezone('Asia/Tokyo',now()))::date),0)),
'points',coalesce((select jsonb_agg(to_jsonb(x)order by x.created_at desc)from(select pt.id,pt.amount,pt.reason,pt.created_at from public.point_transactions pt,me where pt.user_id=me.uid order by pt.created_at desc limit 30)x),'[]'::jsonb),
'posts',coalesce((select jsonb_agg(to_jsonb(x)order by x.created_at desc)from(select s.id,s.title,s.category,s.address,s.like_count,s.report_count,s.is_hidden,s.created_at from public.spots s,me where s.created_by=me.uid order by s.created_at desc limit 20)x),'[]'::jsonb),
'gacha',coalesce((select jsonb_agg(to_jsonb(x)order by x.created_at desc)from(select g.id,g.prize_rank,g.prize_points,g.created_at from public.gacha_results g,me where g.user_id=me.uid order by g.created_at desc limit 20)x),'[]'::jsonb),
'deletionStatus',(select adr.status from public.account_deletion_requests adr,me where adr.user_id=me.uid and adr.status in('pending','processing')order by adr.requested_at desc limit 1))from me;$function$;

commit;
