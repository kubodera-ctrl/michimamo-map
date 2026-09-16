begin;
do $$
declare
 u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid();
 v jsonb; r jsonb; repeat_r jsonb; sid uuid; choice integer; i integer; m text;
begin
 insert into auth.users(id,aud,role) values(u,'authenticated','authenticated'),(other_user,'authenticated','authenticated');
 insert into public.profiles(auth_id,name,point) select u,'quiz rollback test',0 where not exists(select 1 from public.profiles where auth_id=u);
 perform set_config('request.jwt.claim.sub',u::text,true);
 set local role authenticated;
 begin perform public.claim_quiz_points(10); raise exception 'FAIL old score endpoint open';
 exception when insufficient_privilege then null; end;
 begin perform (select count(*) from app_private.quiz_questions); raise exception 'FAIL answer bank readable';
 exception when insufficient_privilege then null; end;
 begin perform (select count(*) from app_private.quiz_sessions); raise exception 'FAIL sessions readable';
 exception when insufficient_privilege then null; end;
 begin perform public.start_quiz(null); raise exception 'FAIL invalid mode';
 exception when invalid_parameter_value then null; end;
 foreach m in array array['car','bike','mix'] loop
  v:=public.start_quiz(m); sid:=(v->>'session_id')::uuid;
  if v->'question' ? 'a' or v->'question' ? 'e' then raise exception 'FAIL premature answer'; end if;
  reset role;
  if (select jsonb_array_length(questions) from app_private.quiz_sessions where user_id=u)<>10 then raise exception 'FAIL length'; end if;
  if (select count(distinct x->>'q') from app_private.quiz_sessions s, lateral jsonb_array_elements(s.questions) x where s.user_id=u)<>10 then raise exception 'FAIL duplicates'; end if;
  if m='mix' and (select count(*) from app_private.quiz_sessions s, lateral jsonb_array_elements(s.questions) x where s.user_id=u and x->>'id' like 'car%')<>5 then raise exception 'FAIL mix'; end if;
  set local role authenticated;
 end loop;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 begin perform public.answer_quiz(sid,0,0); raise exception 'FAIL other user session';
 exception when raise_exception then if sqlerrm<>'quiz_session_not_found' then raise; end if; end;
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin perform public.answer_quiz(sid,1,0); raise exception 'FAIL skip';
 exception when raise_exception then if sqlerrm<>'quiz_answer_out_of_order' then raise; end if; end;
 begin perform public.answer_quiz(sid,0,null); raise exception 'FAIL null';
 exception when invalid_parameter_value then null; end;
 begin perform public.answer_quiz(sid,0,99); raise exception 'FAIL range';
 exception when invalid_parameter_value then null; end;
 for i in 0..9 loop
  reset role;
  select (questions->i->>'a')::integer into choice from app_private.quiz_sessions where user_id=u;
  if i=0 then choice:=(choice+1)%3; end if;
  set local role authenticated;
  r:=public.answer_quiz(sid,i,choice);
  repeat_r:=public.answer_quiz(sid,i,choice);
  if r<>repeat_r then raise exception 'FAIL retry'; end if;
  if i<9 and (r->'next_question' ? 'a' or r->'next_question' ? 'e') then raise exception 'FAIL next answer leaked'; end if;
  begin perform public.answer_quiz(sid,i,(choice+1)%3); raise exception 'FAIL change answer';
  exception when raise_exception then if sqlerrm<>'quiz_answer_locked' then raise; end if; end;
 end loop;
 if (r->>'score')::integer<>9 or (r->>'awarded')::integer<>9 then raise exception 'FAIL grade %',r; end if;
 -- Practice session on same JST day cannot award again.
 v:=public.start_quiz('car'); sid:=(v->>'session_id')::uuid;
 for i in 0..9 loop
  reset role;
  select (questions->i->>'a')::integer into choice from app_private.quiz_sessions where user_id=u;
  set local role authenticated;
  r:=public.answer_quiz(sid,i,choice);
 end loop;
 if (r->>'score')::integer<>10 or (r->>'awarded')::integer<>0 or not (r->>'already_claimed')::boolean then raise exception 'FAIL daily cap'; end if;
 reset role;
 if (select count(*) from public.point_transactions where user_id=u and reason='quiz')<>1 then raise exception 'FAIL duplicate points'; end if;
 if (select score from public.quiz_claims where user_id=u)<>9 then raise exception 'FAIL claim changed'; end if;
 -- Expiry must not consume a daily claim.
 update app_private.quiz_sessions set created_at=now()-interval '3 hours',responses='[]' where user_id=u;
 set local role authenticated;
 begin perform public.answer_quiz(sid,0,0); raise exception 'FAIL expiry';
 exception when raise_exception then if sqlerrm<>'quiz_session_expired' then raise; end if; end;
 reset role;
 perform set_config('request.jwt.claim.sub','',true);
 set local role anon;
 begin perform public.start_quiz('car'); raise exception 'FAIL anonymous';
 exception when insufficient_privilege then null; end;
 reset role;
end $$;
select 'PASS: modes, hidden answers, ownership, ordering, invalid inputs, grading 9/10, exact retry, answer lock, daily cap, expiry, anonymous and old endpoint blocked. All fixtures rolled back.' as result;
rollback;
