begin;

-- 管理者一覧はクライアントから直接読み書きできない。
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'moderator')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;

-- 初期ownerは本番反映時にSQL Editorから一度だけ登録する。
-- 個別のAuthユーザーIDは公開リポジトリへ保存しない。

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists(
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  );
$$;
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- 既存パスワード確認に、サーバー側のログインユーザー権限確認を追加する。
create or replace function public.admin_validate(p_password text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.is_current_user_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  -- 既存のハッシュ照合済み管理者パスワードを第二認証として維持する。
  perform public.admin_export_spots(p_password);
end;
$$;
revoke all on function public.admin_validate(text) from public, anon, authenticated;

alter table public.admin_audit_log
  add column if not exists actor_user_id uuid references auth.users(id);

create or replace function public.admin_get_dashboard(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
      select a.id, a.action, a.target_type, a.target_id, a.detail, a.actor_user_id, a.created_at
      from public.admin_audit_log a order by a.created_at desc limit 50
    ) x), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.admin_moderate_spot(p_password text, p_spot_id bigint, p_hide boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_validate(p_password);
  update public.spots set is_hidden = p_hide where id = p_spot_id;
  if not found then raise exception 'spot_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values(case when p_hide then 'hide' else 'restore' end, 'spot', p_spot_id::text, jsonb_build_object('hidden', p_hide), auth.uid());
  return true;
end;
$$;

create or replace function public.admin_set_user_suspension(p_password text, p_user_id uuid, p_suspend boolean, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_validate(p_password);
  if p_suspend and exists(select 1 from public.admin_users where user_id = p_user_id and is_active) then
    raise exception 'cannot_suspend_admin' using errcode = '42501';
  end if;
  insert into public.user_moderation(user_id, status, reason, updated_at)
  values(p_user_id, case when p_suspend then 'suspended' else 'active' end, nullif(left(trim(coalesce(p_reason,'')),500),''), now())
  on conflict(user_id) do update set status = excluded.status, reason = excluded.reason, updated_at = now();
  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values(case when p_suspend then 'suspend' else 'unsuspend' end, 'user', p_user_id::text, jsonb_build_object('reason', p_reason), auth.uid());
  return true;
end;
$$;

create or replace function public.admin_update_deletion_request(p_password text, p_request_id bigint, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_validate(p_password);
  if p_status not in ('processing','completed','cancelled') then raise exception 'invalid_status' using errcode = '22023'; end if;
  update public.account_deletion_requests set status = p_status, updated_at = now() where id = p_request_id;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values('deletion_' || p_status, 'deletion_request', p_request_id::text, jsonb_build_object('status', p_status), auth.uid());
  return true;
end;
$$;

-- CSVも必ずログイン中の管理者だけが取得できるラッパーを通す。
create or replace function public.admin_export_spots_secure(p_password text)
returns table(created_at timestamptz, category text, address text, title text, comment text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_validate(p_password);
  return query
    select s.created_at, s.category, s.address, s.title, s.comment
    from public.spots s
    order by s.created_at desc;
end;
$$;

-- 旧パスワード単独RPCはクライアントから実行不可にする。
revoke all on function public.admin_export_spots(text) from public, anon, authenticated;
revoke all on function public.admin_get_dashboard(text) from public, anon, authenticated;
revoke all on function public.admin_moderate_spot(text,bigint,boolean) from public, anon, authenticated;
revoke all on function public.admin_set_user_suspension(text,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.admin_update_deletion_request(text,bigint,text) from public, anon, authenticated;
revoke all on function public.admin_export_spots_secure(text) from public, anon, authenticated;

grant execute on function public.admin_get_dashboard(text) to authenticated;
grant execute on function public.admin_moderate_spot(text,bigint,boolean) to authenticated;
grant execute on function public.admin_set_user_suspension(text,uuid,boolean,text) to authenticated;
grant execute on function public.admin_update_deletion_request(text,bigint,text) to authenticated;
grant execute on function public.admin_export_spots_secure(text) to authenticated;

commit;
