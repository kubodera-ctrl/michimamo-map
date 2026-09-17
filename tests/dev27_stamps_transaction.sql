-- Run after the dev27 migration inside a transaction that is rolled back.
do $$
declare
 u uuid;
 w date:=app_private.jst_week_start();
 receipt jsonb;
 sid uuid;
 answer integer;
 i integer;
 before_points integer;
 after_points integer;
begin
 select auth_id into u from public.profiles
 where public.is_user_active(auth_id) order by created_at limit 1;
 if u is null then raise exception 'dev27_test_requires_active_profile'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);

 receipt:=public.start_quiz('mix'); sid:=(receipt->>'session_id')::uuid;
 for i in 0..9 loop
  select (questions->i->>'a')::integer into answer from app_private.quiz_sessions where user_id=u and id=sid;
  receipt:=public.answer_quiz(sid,i,answer);
 end loop;
 if receipt->>'complete'<>'true' or (receipt->>'score')::integer<>10 or (receipt->>'stamp_awarded')::integer<>1 then
  raise exception 'normal_quiz_stamp_test_failed: %',receipt;
 end if;

 -- Unlimited retry remains available, but the second success on the same JST day earns no second stamp.
 receipt:=public.start_quiz('car'); sid:=(receipt->>'session_id')::uuid;
 for i in 0..9 loop
  select (questions->i->>'a')::integer into answer from app_private.quiz_sessions where user_id=u and id=sid;
  receipt:=public.answer_quiz(sid,i,answer);
 end loop;
 if (receipt->>'stamp_awarded')::integer<>0 then raise exception 'normal_daily_cap_failed: %',receipt; end if;

 receipt:=public.start_quiz('extra'); sid:=(receipt->>'session_id')::uuid;
 for i in 0..99 loop
  select (questions->i->>'a')::integer into answer from app_private.quiz_sessions where user_id=u and id=sid;
  receipt:=public.answer_quiz(sid,i,answer);
 end loop;
 if (receipt->>'score')::integer<>100 or (receipt->>'stamp_awarded')::integer<>3 then
  raise exception 'extra_quiz_stamp_test_failed: %',receipt;
 end if;

 insert into public.quiz_usage_days(user_id,usage_date)
 select u,d::date from generate_series(w,w+6,interval '1 day') d on conflict do nothing;
 receipt:=public.get_quiz_stamp_status();
 if (receipt->>'loginDays')::integer<>7 or receipt->>'loginStamp'<>'true' then
  raise exception 'line_usage_stamp_test_failed: %',receipt;
 end if;

 -- Add five synthetic daily normal events to reach ten total stamps (1 + 3 + 1 + 5).
 for i in 1..5 loop
  insert into public.weekly_stamp_events(user_id,week_start,event_type,event_key,stamps)
  values(u,w,'normal_quiz','dev27-test-'||i,1);
 end loop;
 select point into before_points from public.profiles where auth_id=u;
 if app_private.finish_weekly_reward(u,w)<>50 then raise exception 'weekly_reward_missing'; end if;
 if app_private.finish_weekly_reward(u,w)<>0 then raise exception 'weekly_reward_duplicated'; end if;
 select point into after_points from public.profiles where auth_id=u;
 if after_points-before_points<>50 then raise exception 'weekly_reward_amount_failed'; end if;
end$$;
