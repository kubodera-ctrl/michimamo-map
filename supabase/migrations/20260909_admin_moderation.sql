begin;

alter table public.spots add column if not exists is_hidden boolean not null default false;

create table if not exists public.user_moderation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reason text,
  updated_at timestamptz not null default now()
);
alter table public.user_moderation enable row level security;
revoke all on table public.user_moderation from anon, authenticated;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from anon, authenticated;

create or replace function public.is_user_active(p_user_id uuid)
returns boolean language sql security definer stable set search_path = public, pg_temp as $$
  select not exists(select 1 from public.user_moderation um where um.user_id = p_user_id and um.status = 'suspended');
$$;
revoke all on function public.is_user_active(uuid) from public;
grant execute on function public.is_user_active(uuid) to authenticated;

create or replace function public.enforce_active_spot_vote()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_user_active(new.user_id) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists spot_votes_active_user on public.spot_votes;
create trigger spot_votes_active_user before insert on public.spot_votes
for each row execute function public.enforce_active_spot_vote();

create or replace function public.apply_point_transaction(p_user_id uuid, p_amount integer, p_reason text, p_ref_key text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_balance integer;
begin
  if p_amount = 0 or p_ref_key is null or p_ref_key = '' then
    raise exception 'invalid_point_transaction' using errcode = '22023';
  end if;
  if p_reason <> 'admin' and not public.is_user_active(p_user_id) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;
  insert into public.point_transactions(user_id, amount, reason, ref_key)
  values(p_user_id, p_amount, p_reason, p_ref_key);
  update public.profiles set point = greatest(0, coalesce(point, 0) + p_amount)
  where auth_id = p_user_id returning point into v_balance;
  if v_balance is null then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return v_balance;
end;
$$;
revoke all on function public.apply_point_transaction(uuid,integer,text,text) from public;

drop policy if exists spots_public_read on public.spots;
create policy spots_public_read on public.spots for select to anon, authenticated
using (is_hidden = false or created_by = auth.uid());

drop policy if exists spots_authenticated_insert on public.spots;
create policy spots_authenticated_insert on public.spots for insert to authenticated
with check (auth.uid() is not null and created_by = auth.uid() and public.is_user_active(auth.uid()));

create or replace function public.admin_validate(p_password text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.admin_export_spots(p_password);
end;
$$;
revoke all on function public.admin_validate(text) from public;

create or replace function public.admin_get_dashboard(p_password text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_result jsonb;
begin
  perform public.admin_validate(p_password);
  select jsonb_build_object(
    'deletions', coalesce((select jsonb_agg(to_jsonb(x) order by x.requested_at desc) from (
      select adr.id, adr.user_id, p.name, adr.reason, adr.status, adr.requested_at
      from public.account_deletion_requests adr left join public.profiles p on p.auth_id = adr.user_id
      order by adr.requested_at desc limit 50
    ) x), '[]'::jsonb),
    'reportedSpots', coalesce((select jsonb_agg(to_jsonb(x) order by x.report_count desc, x.created_at desc) from (
      select s.id, s.title, s.address, s.category, s.report_count, s.is_hidden, s.created_by, p.name, s.created_at
      from public.spots s left join public.profiles p on p.auth_id = s.created_by
      where coalesce(s.report_count, 0) > 0 order by s.report_count desc, s.created_at desc limit 50
    ) x), '[]'::jsonb),
    'pointAlerts', coalesce((select jsonb_agg(to_jsonb(x) order by x.earned_24h desc) from (
      select pt.user_id, p.name, sum(pt.amount) filter (where pt.amount > 0 and pt.reason not in ('gacha_prize','admin')) as earned_24h,
             count(*) filter (where pt.amount > 0 and pt.reason not in ('gacha_prize','admin')) as action_count,
             coalesce(um.status, 'active') as status
      from public.point_transactions pt left join public.profiles p on p.auth_id = pt.user_id
      left join public.user_moderation um on um.user_id = pt.user_id
      where pt.created_at >= now() - interval '24 hours'
      group by pt.user_id, p.name, um.status
      having sum(pt.amount) filter (where pt.amount > 0 and pt.reason not in ('gacha_prize','admin')) >= 30
      order by earned_24h desc limit 50
    ) x), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select a.id, a.action, a.target_type, a.target_id, a.detail, a.created_at from public.admin_audit_log a order by a.created_at desc limit 50
    ) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_moderate_spot(p_password text, p_spot_id bigint, p_hide boolean)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.admin_validate(p_password);
  update public.spots set is_hidden = p_hide where id = p_spot_id;
  if not found then raise exception 'spot_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_log(action, target_type, target_id, detail)
  values(case when p_hide then 'hide' else 'restore' end, 'spot', p_spot_id::text, jsonb_build_object('hidden', p_hide));
  return true;
end;
$$;

create or replace function public.admin_set_user_suspension(p_password text, p_user_id uuid, p_suspend boolean, p_reason text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.admin_validate(p_password);
  insert into public.user_moderation(user_id, status, reason, updated_at)
  values(p_user_id, case when p_suspend then 'suspended' else 'active' end, nullif(left(trim(coalesce(p_reason,'')),500),''), now())
  on conflict(user_id) do update set status = excluded.status, reason = excluded.reason, updated_at = now();
  insert into public.admin_audit_log(action, target_type, target_id, detail)
  values(case when p_suspend then 'suspend' else 'unsuspend' end, 'user', p_user_id::text, jsonb_build_object('reason', p_reason));
  return true;
end;
$$;

create or replace function public.admin_update_deletion_request(p_password text, p_request_id bigint, p_status text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.admin_validate(p_password);
  if p_status not in ('processing','completed','cancelled') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.account_deletion_requests set status = p_status, updated_at = now() where id = p_request_id;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_log(action, target_type, target_id, detail)
  values('deletion_' || p_status, 'deletion_request', p_request_id::text, jsonb_build_object('status', p_status));
  return true;
end;
$$;

revoke all on function public.admin_get_dashboard(text) from public;
revoke all on function public.admin_moderate_spot(text,bigint,boolean) from public;
revoke all on function public.admin_set_user_suspension(text,uuid,boolean,text) from public;
revoke all on function public.admin_update_deletion_request(text,bigint,text) from public;
grant execute on function public.admin_get_dashboard(text) to anon, authenticated;
grant execute on function public.admin_moderate_spot(text,bigint,boolean) to anon, authenticated;
grant execute on function public.admin_set_user_suspension(text,uuid,boolean,text) to anon, authenticated;
grant execute on function public.admin_update_deletion_request(text,bigint,text) to anon, authenticated;

commit;
