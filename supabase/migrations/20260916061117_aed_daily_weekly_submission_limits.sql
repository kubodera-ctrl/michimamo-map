create or replace function app_private.enforce_aed_submission_limits()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_day timestamptz := date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
  v_week timestamptz := date_trunc('week', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
  v_daily integer;
  v_weekly integer;
begin
  if v_user is null or new.user_id is distinct from v_user then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  -- Serialize this user's inserts before counting; another user has a separate lock.
  perform pg_advisory_xact_lock(hashtextextended('aed_submission_limit:' || v_user::text, 0));
  select count(*) filter (where created_at >= v_day), count(*)
    into v_daily, v_weekly
    from public.aed_submissions
    where user_id = v_user and created_at >= v_week;
  if v_weekly >= 20 then
    raise exception 'aed_weekly_limit' using errcode = 'P0001';
  end if;
  if v_daily >= 10 then
    raise exception 'aed_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function app_private.enforce_aed_submission_limits() from public, anon, authenticated;
-- Run after the existing prepare trigger which sets the server-owned timestamp.
create trigger z_aed_submission_limits
before insert on public.aed_submissions
for each row execute function app_private.enforce_aed_submission_limits();
