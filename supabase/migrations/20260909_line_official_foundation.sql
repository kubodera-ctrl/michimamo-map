begin;

-- LINE公式アカウントの公開設定。クライアントからの直接更新は許可しない。
create table if not exists public.app_public_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_public_settings enable row level security;
revoke all on table public.app_public_settings from anon, authenticated;

insert into public.app_public_settings(setting_key, setting_value)
values('line_official', jsonb_build_object(
  'enabled', false,
  'display_name', 'まちまもMAP公式LINE',
  'friend_add_url', null
))
on conflict(setting_key) do nothing;

-- 配信希望は本人が変更可能。友だち状態はLINE連携処理（service_role）だけが更新する。
create table if not exists public.line_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  campaigns boolean not null default true,
  point_updates boolean not null default true,
  traffic_rules boolean not null default true,
  regional_updates boolean not null default true,
  region text,
  friend_status text not null default 'unknown'
    check (friend_status in ('unknown', 'friend', 'not_friend', 'blocked')),
  friend_status_checked_at timestamptz,
  updated_at timestamptz not null default now(),
  check (region is null or length(region) <= 40)
);
alter table public.line_notification_preferences enable row level security;
revoke all on table public.line_notification_preferences from anon, authenticated;

create or replace function public.get_my_line_settings()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  insert into public.line_notification_preferences(user_id)
  values(v_user_id)
  on conflict(user_id) do nothing;

  select jsonb_build_object(
    'preferences', jsonb_build_object(
      'campaigns', p.campaigns,
      'pointUpdates', p.point_updates,
      'trafficRules', p.traffic_rules,
      'regionalUpdates', p.regional_updates,
      'region', p.region,
      'friendStatus', p.friend_status,
      'friendStatusCheckedAt', p.friend_status_checked_at
    ),
    'official', coalesce((
      select case
        when coalesce((s.setting_value->>'enabled')::boolean, false)
          and s.setting_value->>'friend_add_url' ~ '^https://(lin[.]ee/|line[.]me/R/ti/p/)'
        then s.setting_value
        else jsonb_build_object(
          'enabled', false,
          'display_name', coalesce(s.setting_value->>'display_name', 'まちまもMAP公式LINE'),
          'friend_add_url', null
        )
      end
      from public.app_public_settings s where s.setting_key = 'line_official'
    ), jsonb_build_object('enabled', false, 'display_name', 'まちまもMAP公式LINE', 'friend_add_url', null))
  ) into v_result
  from public.line_notification_preferences p
  where p.user_id = v_user_id;

  return v_result;
end;
$$;

create or replace function public.update_my_line_preferences(
  p_campaigns boolean,
  p_point_updates boolean,
  p_traffic_rules boolean,
  p_regional_updates boolean,
  p_region text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_region text := nullif(left(trim(coalesce(p_region, '')), 40), '');
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  insert into public.line_notification_preferences(
    user_id, campaigns, point_updates, traffic_rules, regional_updates, region, updated_at
  ) values(
    v_user_id, coalesce(p_campaigns, false), coalesce(p_point_updates, false),
    coalesce(p_traffic_rules, false), coalesce(p_regional_updates, false), v_region, now()
  )
  on conflict(user_id) do update set
    campaigns = excluded.campaigns,
    point_updates = excluded.point_updates,
    traffic_rules = excluded.traffic_rules,
    regional_updates = excluded.regional_updates,
    region = excluded.region,
    updated_at = now();

  return true;
end;
$$;

-- Edge Functionから取得したLINEの友だち状態だけを記録する。通常クライアントには実行権限を与えない。
create or replace function public.record_line_friend_status(p_user_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('friend', 'not_friend', 'blocked') then
    raise exception 'invalid_friend_status' using errcode = '22023';
  end if;

  insert into public.line_notification_preferences(user_id, friend_status, friend_status_checked_at)
  values(p_user_id, p_status, now())
  on conflict(user_id) do update set
    friend_status = excluded.friend_status,
    friend_status_checked_at = now(),
    updated_at = now();
  return true;
end;
$$;

create or replace function public.admin_set_line_official_config(
  p_password text,
  p_enabled boolean,
  p_friend_add_url text,
  p_display_name text default 'まちまもMAP公式LINE'
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url text := nullif(trim(coalesce(p_friend_add_url, '')), '');
  v_name text := nullif(left(trim(coalesce(p_display_name, '')), 60), '');
begin
  perform public.admin_validate(p_password);
  if coalesce(p_enabled, false) and (v_url is null or v_url !~ '^https://(lin[.]ee/|line[.]me/R/ti/p/)') then
    raise exception 'invalid_line_friend_url' using errcode = '22023';
  end if;

  insert into public.app_public_settings(setting_key, setting_value, updated_at)
  values('line_official', jsonb_build_object(
    'enabled', coalesce(p_enabled, false),
    'display_name', coalesce(v_name, 'まちまもMAP公式LINE'),
    'friend_add_url', case when p_enabled then v_url else null end
  ), now())
  on conflict(setting_key) do update set setting_value = excluded.setting_value, updated_at = now();

  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values('line_official_config', 'app_setting', 'line_official',
    jsonb_build_object('enabled', coalesce(p_enabled, false), 'display_name', coalesce(v_name, 'まちまもMAP公式LINE')),
    auth.uid());
  return true;
end;
$$;

revoke all on function public.get_my_line_settings() from public, anon, authenticated;
revoke all on function public.update_my_line_preferences(boolean,boolean,boolean,boolean,text) from public, anon, authenticated;
revoke all on function public.record_line_friend_status(uuid,text) from public, anon, authenticated;
revoke all on function public.admin_set_line_official_config(text,boolean,text,text) from public, anon, authenticated;
grant execute on function public.get_my_line_settings() to authenticated;
grant execute on function public.update_my_line_preferences(boolean,boolean,boolean,boolean,text) to authenticated;
grant execute on function public.record_line_friend_status(uuid,text) to service_role;
grant execute on function public.admin_set_line_official_config(text,boolean,text,text) to authenticated;

commit;
