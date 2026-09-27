begin;

do $$
declare
  v_schedule text;
begin
  select schedule into v_schedule from cron.job
  where jobname='camera-evidence-retention-hourly' and active
  limit 1;

  if v_schedule is distinct from '37 * * * *' then
    raise exception 'camera retention cron missing or unexpected schedule: %',v_schedule;
  end if;

  if has_function_privilege('anon','public.camera_retention_authorize(text)','EXECUTE')
     or has_function_privilege('authenticated','public.camera_retention_authorize(text)','EXECUTE') then
    raise exception 'camera retention authorize exposed';
  end if;

  if not has_function_privilege('service_role','public.camera_retention_authorize(text)','EXECUTE') then
    raise exception 'service role cannot authorize retention';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='app_private' and table_name='camera_retention_nonces' and column_name='expires_at'
  ) then raise exception 'camera retention nonce table missing'; end if;
end $$;

rollback;
