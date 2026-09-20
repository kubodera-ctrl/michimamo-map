begin;

do $$
declare d text;
begin
  select pg_get_functiondef(p.oid) into d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname='answer_quiz';

  if d is null then raise exception 'answer_quiz not found'; end if;
  if d not like '%interval ''5 seconds''%' then raise exception 'Extra quiz must enforce five seconds'; end if;
  if d like '%interval ''7 seconds''%' then raise exception 'legacy seven-second grace remains'; end if;
end $$;

rollback;
