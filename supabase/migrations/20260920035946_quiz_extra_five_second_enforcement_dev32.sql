-- Development 32: enforce the documented 5-second limit for Extra quiz answers on the server.
create or replace function app_private.answer_quiz(p_session_id uuid, p_index integer, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  u uuid:=auth.uid();
  s app_private.quiz_sessions%rowtype;
  q jsonb;
  r jsonb;
  n integer;
  correct boolean;
  complete boolean;
  gained integer:=0;
  reward integer:=0;
  w date:=app_private.jst_week_start();
  d date:=timezone('Asia/Tokyo',now())::date;
begin
  if u is null or not public.is_user_active(u) then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('quiz:'||u::text,0));
  select * into s from app_private.quiz_sessions where user_id=u and id=p_session_id for update;
  if not found then raise exception 'quiz_session_not_found'; end if;

  n:=jsonb_array_length(s.responses);
  if p_index<n then
    r:=s.responses->p_index;
    if (r->>'choice')::int is distinct from p_choice then raise exception 'quiz_answer_locked'; end if;
    return r;
  end if;

  if p_index<>n or p_index<0 or p_index>=s.target_count or p_choice< -1 then raise exception 'invalid_quiz_answer'; end if;

  q:=s.questions->n;
  correct:=p_choice>=0
    and p_choice=(q->>'a')::int
    and not(s.mode='extra' and now()>s.question_started_at+interval '5 seconds');

  s.score:=s.score+case when correct then 1 else 0 end;
  complete:=n=s.target_count-1;

  if complete and ((s.mode='extra' and s.score>=98) or (s.mode<>'extra' and s.score>=9)) then
    if s.mode='extra' then
      insert into public.weekly_stamp_events(user_id,week_start,event_type,event_key,stamps)
      values(u,w,'extra_quiz',w::text,3) on conflict do nothing;
      if found then gained:=3; end if;
    else
      insert into public.weekly_stamp_events(user_id,week_start,event_type,event_key,stamps)
      values(u,w,'normal_quiz',d::text,1) on conflict do nothing;
      if found then gained:=1; end if;
    end if;
    reward:=app_private.finish_weekly_reward(u,w);
  end if;

  r:=jsonb_build_object(
    'index',n,'choice',p_choice,'correct',correct,'answer',(q->>'a')::int,
    'explanation',q->>'e','score',s.score,'complete',complete,'total',s.target_count,
    'mode',s.mode,'stamp_awarded',gained,'point_reward',reward,
    'next_question',case when not complete then (s.questions->(n+1))-'a'-'e' else null end
  );

  update app_private.quiz_sessions
  set responses=responses||jsonb_build_array(r),score=s.score,question_started_at=now()
  where user_id=u;

  return r;
end
$function$;

do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname='answer_quiz';

  if d not like '%interval ''5 seconds''%' then raise exception '5 second enforcement not present'; end if;
  if d like '%interval ''7 seconds''%' then raise exception 'legacy 7 second enforcement remains'; end if;
end $$;
