-- Development 27: authoritative 430-question bank and stamp rewards.
begin;

alter table public.point_transactions drop constraint if exists point_transactions_reason_check;
alter table public.point_transactions add constraint point_transactions_reason_check check(reason in (
 'spot_post','spot_like','quiz','gacha_cost','gacha_prize','admin','aed_new_approval',
 'weekly_quiz_stamp_reward','aed_stamp_reward'
));

-- New point rules apply only to future activity. Existing ledger entries are preserved.
create or replace function public.award_spot_post_points() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.created_by::text,2202));
 select count(*) into n from public.point_transactions where user_id=new.created_by and reason='spot_post'
 and created_at >= date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
 if n<5 then perform public.apply_point_transaction(new.created_by,1,'spot_post',new.id::text); end if;
 return new;
end$$;

create or replace function public.vote_spot(p_spot_id bigint,p_kind text) returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); n bigint; owner_id uuid; earned integer;
begin
 if u is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if not public.is_user_active(u) then raise exception 'account_suspended' using errcode='42501'; end if;
 if p_kind not in ('like','report','confirm') then raise exception 'invalid_vote_kind'; end if;
 select created_by into owner_id from public.spots where id=p_spot_id;
 if not found then raise exception 'spot_not_found'; end if;
 if p_kind='like' and owner_id=u then raise exception 'cannot_like_own_spot'; end if;
 perform pg_advisory_xact_lock(hashtextextended('spot-like:'||u::text,0));
 insert into public.spot_votes(spot_id,user_id,kind) values(p_spot_id,u,p_kind) on conflict do nothing;
 if not found then raise exception 'already_voted' using errcode='23505'; end if;
 if p_kind='like' then
  update public.spots set like_count=coalesce(like_count,0)+1 where id=p_spot_id returning like_count into n;
  select count(*) into earned from public.point_transactions where user_id=u and reason='spot_like'
   and created_at>=date_trunc('day',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
  if earned<5 then perform public.apply_point_transaction(u,1,'spot_like',p_spot_id::text); end if;
 elsif p_kind='report' then update public.spots set report_count=coalesce(report_count,0)+1 where id=p_spot_id returning report_count into n;
 else update public.spots set confirm_count=coalesce(confirm_count,0)+1 where id=p_spot_id returning confirm_count into n; end if;
 return n;
end$$;

truncate app_private.quiz_questions;
insert into app_private.quiz_questions(id,mode,body)
select x->>'id',x->>'mode',jsonb_build_object('q',x->>'q','o',x->'o','a',(x->>'a')::int,'e',x->>'e','sign',x->'sign')
from jsonb_array_elements('__QUIZ_BANK_JSON__'::jsonb) x;

alter table app_private.quiz_sessions drop constraint if exists quiz_sessions_score_check;
alter table app_private.quiz_sessions add column if not exists mode text not null default 'mix';
alter table app_private.quiz_sessions add column if not exists target_count integer not null default 10;
alter table app_private.quiz_sessions add column if not exists question_started_at timestamptz not null default now();
alter table app_private.quiz_sessions add constraint quiz_sessions_score_check check(score between 0 and 100);

create table public.quiz_usage_days(user_id uuid not null references auth.users(id) on delete cascade,usage_date date not null,created_at timestamptz not null default now(),primary key(user_id,usage_date));
create table public.weekly_stamp_events(user_id uuid not null references auth.users(id) on delete cascade,week_start date not null,event_type text not null check(event_type in ('normal_quiz','extra_quiz','line_7_days')),event_key text not null,stamps integer not null check(stamps in (1,3)),created_at timestamptz not null default now(),primary key(user_id,event_type,event_key));
create table public.weekly_stamp_rewards(user_id uuid not null references auth.users(id) on delete cascade,week_start date not null,point_transaction_id bigint not null unique references public.point_transactions(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,week_start));
create table public.aed_stamp_events(submission_id uuid primary key references public.aed_submissions(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,safety_spot_id bigint not null references public.safety_spots(id),created_at timestamptz not null default now());
create table public.aed_stamp_rewards(user_id uuid not null references auth.users(id) on delete cascade,milestone integer not null check(milestone>0),point_transaction_id bigint not null unique references public.point_transactions(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,milestone));
create index aed_stamp_events_user_idx on public.aed_stamp_events(user_id);
create index aed_stamp_events_safety_spot_idx on public.aed_stamp_events(safety_spot_id);
alter table public.quiz_usage_days enable row level security; alter table public.weekly_stamp_events enable row level security; alter table public.weekly_stamp_rewards enable row level security; alter table public.aed_stamp_events enable row level security; alter table public.aed_stamp_rewards enable row level security;
revoke all on public.quiz_usage_days,public.weekly_stamp_events,public.weekly_stamp_rewards,public.aed_stamp_events,public.aed_stamp_rewards from public,anon,authenticated;

-- account_deletion_clean_data removes the profile before Auth Admin removes
-- the identity. Delete dev27-owned history at the same boundary.
create or replace function app_private.cleanup_dev27_user_data() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from public.weekly_stamp_rewards where user_id=old.auth_id;
 delete from public.aed_stamp_rewards where user_id=old.auth_id;
 delete from public.weekly_stamp_events where user_id=old.auth_id;
 delete from public.quiz_usage_days where user_id=old.auth_id;
 delete from public.aed_stamp_events where user_id=old.auth_id;
 return old;
end$$;
revoke all on function app_private.cleanup_dev27_user_data() from public,anon,authenticated;
drop trigger if exists cleanup_dev27_user_data on public.profiles;
create trigger cleanup_dev27_user_data before delete on public.profiles
for each row execute function app_private.cleanup_dev27_user_data();

create or replace function app_private.jst_week_start() returns date language sql stable set search_path='' as $$select date_trunc('week',timezone('Asia/Tokyo',now()))::date$$;
create or replace function app_private.finish_weekly_reward(u uuid,w date) returns integer language plpgsql security definer set search_path='' as $$
declare total integer; tx bigint; bal integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('weekly-stamp-reward:'||u::text||':'||w::text,0));
 select coalesce(sum(stamps),0) into total from public.weekly_stamp_events where user_id=u and week_start=w;
 if total>=10 and not exists(select 1 from public.weekly_stamp_rewards where user_id=u and week_start=w) then
  bal:=public.apply_point_transaction(u,50,'weekly_quiz_stamp_reward',w::text);
  select id into tx from public.point_transactions where user_id=u and reason='weekly_quiz_stamp_reward' and ref_key=w::text;
  insert into public.weekly_stamp_rewards(user_id,week_start,point_transaction_id) values(u,w,tx) on conflict do nothing;
  return 50;
 end if; return 0;
end$$;

create or replace function app_private.record_usage(u uuid) returns void language plpgsql security definer set search_path='' as $$
declare d date:=timezone('Asia/Tokyo',now())::date; w date:=app_private.jst_week_start(); days integer;
begin
 -- The current authenticated account flow is LINE-only. Opening the app while its session is valid counts once per JST day.
 insert into public.quiz_usage_days(user_id,usage_date) values(u,d) on conflict do nothing;
 select count(*) into days from public.quiz_usage_days where user_id=u and usage_date between w and w+6;
 if days>=7 then insert into public.weekly_stamp_events(user_id,week_start,event_type,event_key,stamps) values(u,w,'line_7_days',w::text,1) on conflict do nothing; perform app_private.finish_weekly_reward(u,w); end if;
end$$;

create or replace function public.get_quiz_stamp_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w date:=app_private.jst_week_start(); d date:=timezone('Asia/Tokyo',now())::date; total integer; quiz_total integer; days integer; aed_total integer;
begin
 if u is null or not public.is_user_active(u) then raise exception 'authentication_required'; end if; perform app_private.record_usage(u);
 select coalesce(sum(stamps),0) into total from public.weekly_stamp_events where user_id=u and week_start=w;
 select coalesce(sum(stamps),0) into quiz_total from public.weekly_stamp_events where user_id=u and week_start=w and event_type in ('normal_quiz','extra_quiz');
 select count(*) into days from public.quiz_usage_days where user_id=u and usage_date between w and w+6;
 select count(*) into aed_total from public.aed_stamp_events where user_id=u;
 return jsonb_build_object('weekStart',w,'weekEnd',w+6,'stamps',least(total,11),'quizStamps',least(quiz_total,10),'loginDays',least(days,7),'loginStamp',exists(select 1 from public.weekly_stamp_events where user_id=u and event_type='line_7_days' and week_start=w),'aedStamps',aed_total,'aedCurrentSheet',aed_total%10,'aedRewards',aed_total/10,'rewarded',exists(select 1 from public.weekly_stamp_rewards where user_id=u and week_start=w),'normalClaimedToday',exists(select 1 from public.weekly_stamp_events where user_id=u and event_type='normal_quiz' and event_key=d::text),'extraClaimedThisWeek',exists(select 1 from public.weekly_stamp_events where user_id=u and event_type='extra_quiz' and event_key=w::text));
end$$;
revoke all on function public.get_quiz_stamp_status() from public,anon,authenticated; grant execute on function public.get_quiz_stamp_status() to authenticated;

create or replace function app_private.start_quiz(p_mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); qs jsonb; q jsonb; arranged jsonb:='[]'; options jsonb; answer integer; sid uuid:=gen_random_uuid(); target integer:=case when p_mode='extra' then 100 else 10 end;
begin
 if u is null or not public.is_user_active(u) then raise exception 'authentication_required'; end if;
 if p_mode not in ('car','bike','mix','extra') then raise exception 'invalid_quiz_mode'; end if;
 perform app_private.record_usage(u); perform pg_advisory_xact_lock(hashtextextended('quiz:'||u::text,0));
 with ranked as (select body,mode,row_number() over(partition by mode order by random()) rn from app_private.quiz_questions)
 select jsonb_agg(body order by random()) into qs from ranked where
  (p_mode='car' and mode='car' and rn<=10) or (p_mode='bike' and mode='bike' and rn<=10) or
  (p_mode='mix' and rn<=5) or (p_mode='extra' and rn<=50);
 if jsonb_array_length(qs)<>target then raise exception 'quiz_bank_unavailable'; end if;
 for q in select value from jsonb_array_elements(qs) loop
  select jsonb_agg(value order by pos),max(pos::int-1) filter(where original=(q->>'a')::int+1) into options,answer from (select value,ordinality original,row_number() over(order by random()) pos from jsonb_array_elements(q->'o') with ordinality) s;
  arranged:=arranged||jsonb_build_array(jsonb_set(jsonb_set(q,'{o}',options),'{a}',to_jsonb(answer)));
 end loop;
 insert into app_private.quiz_sessions(user_id,id,questions,responses,score,created_at,mode,target_count,question_started_at) values(u,sid,arranged,'[]',0,now(),p_mode,target,now()) on conflict(user_id) do update set id=excluded.id,questions=excluded.questions,responses='[]',score=0,created_at=now(),mode=p_mode,target_count=target,question_started_at=now();
 return jsonb_build_object('session_id',sid,'index',0,'mode',p_mode,'total',target,'seconds_per_question',case when p_mode='extra' then 5 else null end,'question',(arranged->0)-'a'-'e');
end$$;

create or replace function app_private.answer_quiz(p_session_id uuid,p_index integer,p_choice integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s app_private.quiz_sessions%rowtype; q jsonb; r jsonb; n integer; correct boolean; complete boolean; gained integer:=0; reward integer:=0; w date:=app_private.jst_week_start(); d date:=timezone('Asia/Tokyo',now())::date;
begin
 if u is null or not public.is_user_active(u) then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('quiz:'||u::text,0)); select * into s from app_private.quiz_sessions where user_id=u and id=p_session_id for update; if not found then raise exception 'quiz_session_not_found'; end if;
 n:=jsonb_array_length(s.responses); if p_index<n then r:=s.responses->p_index; if (r->>'choice')::int is distinct from p_choice then raise exception 'quiz_answer_locked'; end if; return r; end if;
 if p_index<>n or p_index<0 or p_index>=s.target_count or p_choice< -1 then raise exception 'invalid_quiz_answer'; end if;
 q:=s.questions->n; correct:=p_choice>=0 and p_choice=(q->>'a')::int and not(s.mode='extra' and now()>s.question_started_at+interval '7 seconds'); s.score:=s.score+case when correct then 1 else 0 end; complete:=n=s.target_count-1;
 if complete and ((s.mode='extra' and s.score>=98) or (s.mode<>'extra' and s.score>=9)) then
  if s.mode='extra' then insert into public.weekly_stamp_events(user_id,week_start,event_type,event_key,stamps) values(u,w,'extra_quiz',w::text,3) on conflict do nothing; if found then gained:=3; end if;
  else insert into public.weekly_stamp_events(user_id,week_start,event_type,event_key,stamps) values(u,w,'normal_quiz',d::text,1) on conflict do nothing; if found then gained:=1; end if; end if;
  reward:=app_private.finish_weekly_reward(u,w);
 end if;
 r:=jsonb_build_object('index',n,'choice',p_choice,'correct',correct,'answer',(q->>'a')::int,'explanation',q->>'e','score',s.score,'complete',complete,'total',s.target_count,'mode',s.mode,'stamp_awarded',gained,'point_reward',reward,'next_question',case when not complete then (s.questions->(n+1))-'a'-'e' else null end);
 update app_private.quiz_sessions set responses=responses||jsonb_build_array(r),score=s.score,question_started_at=now() where user_id=u; return r;
end$$;

-- AED stamps are issued only for an approved-new submission and never for existing/duplicate/rejected submissions.
create or replace function app_private.award_aed_stamp(p_submission uuid,p_user uuid,p_spot bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare total integer; milestone integer; tx bigint; awarded integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('aed-stamp:'||p_user::text,0));
 insert into public.aed_stamp_events(submission_id,user_id,safety_spot_id) values(p_submission,p_user,p_spot) on conflict do nothing;
 if not found then select count(*) into total from public.aed_stamp_events where user_id=p_user; return jsonb_build_object('stamps',total,'awarded',0); end if;
 select count(*) into total from public.aed_stamp_events where user_id=p_user; milestone:=total/10;
 if total%10=0 then perform public.apply_point_transaction(p_user,50,'aed_stamp_reward',milestone::text); select id into tx from public.point_transactions where user_id=p_user and reason='aed_stamp_reward' and ref_key=milestone::text; insert into public.aed_stamp_rewards(user_id,milestone,point_transaction_id) values(p_user,milestone,tx); awarded:=50; end if;
 return jsonb_build_object('stamps',total,'awarded',awarded);
end$$;

create or replace function public.admin_review_aed_submission(p_submission_id uuid,p_decision text,p_existing_safety_spot_id bigint default null,p_review_notes text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.aed_submissions%rowtype; spot_id bigint; stamp_result jsonb;
begin
 if not public.is_current_user_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_decision not in ('approved_new','approved_existing','rejected','needs_changes') then raise exception 'invalid_decision'; end if;
 select * into s from public.aed_submissions where id=p_submission_id for update;
 if not found then raise exception 'submission_not_found'; end if;
 if s.status in ('approved_new','approved_existing','rejected') then raise exception 'submission_already_finalized' using errcode='23505'; end if;
 if p_decision='approved_new' then
  if p_existing_safety_spot_id is not null then raise exception 'existing_spot_not_allowed_for_new'; end if;
  insert into public.safety_spots(source_key,facility_type,name,prefecture,municipality,address,latitude,longitude,source_name,source_url,source_date,source_license,geocode_source,source_external_id,installation_location,source_updated_at,duplicate_candidate,quality_status)
  values('user-aed:'||s.id::text,'aed',s.facility_name,s.prefecture,nullif(trim(s.municipality),''),s.address,s.latitude,s.longitude,'まちまもMAP ユーザー現地投稿','/aed-submissions/'||s.id::text,current_date,'投稿写真利用許諾（無断転載禁止）','ユーザー投稿GPS（現地確認済み）',s.id::text,s.installation_location,now(),false,'verified') returning id into spot_id;
  stamp_result:=app_private.award_aed_stamp(s.id,s.user_id,spot_id);
 elsif p_decision='approved_existing' then
  if p_existing_safety_spot_id is null or not exists(select 1 from public.safety_spots where id=p_existing_safety_spot_id and facility_type='aed') then raise exception 'existing_aed_required'; end if;
  spot_id:=p_existing_safety_spot_id;
  insert into public.aed_lifecycle_reports(safety_spot_id,report_type,reporter_user_id,description,photo_object_path,latitude,longitude,status,reviewed_by,reviewed_at)
  values(spot_id,case when s.submission_kind='information_update' then 'information_change' else 'existence_confirmed' end,s.user_id,s.installation_location,s.photo_object_path,s.latitude,s.longitude,'accepted',auth.uid(),now());
 end if;
 update public.aed_submissions set status=p_decision,matched_safety_spot_id=spot_id,review_notes=nullif(left(trim(coalesce(p_review_notes,'')),1000),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_submission_id;
 insert into public.admin_audit_log(action,target_type,target_id,detail,actor_user_id) values('aed_submission_'||p_decision,'aed_submission',p_submission_id::text,jsonb_build_object('safety_spot_id',spot_id,'aed_stamp',coalesce(stamp_result,'{}'::jsonb)),auth.uid());
 return jsonb_build_object('submissionId',p_submission_id,'decision',p_decision,'safetySpotId',spot_id,'aedStamp',coalesce(stamp_result,'{}'::jsonb),'awardedPoints',coalesce((stamp_result->>'awarded')::int,0));
end$$;

commit;
