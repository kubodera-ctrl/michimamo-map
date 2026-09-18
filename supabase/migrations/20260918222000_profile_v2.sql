-- Development 29: guest/profile parity and authenticated avatar storage.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  262144,
  array['image/jpeg','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_avatars_owner_insert on storage.objects;
create policy profile_avatars_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_user_active((select auth.uid()))
);

drop policy if exists profile_avatars_owner_select on storage.objects;
create policy profile_avatars_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists profile_avatars_owner_update on storage.objects;
create policy profile_avatars_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_user_active((select auth.uid()))
);

drop policy if exists profile_avatars_owner_delete on storage.objects;
create policy profile_avatars_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function app_private.default_machimamo_name(p_seed text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  adjectives constant text[] := array['青空','元気','ゆる','晴れ','森の','星空','にこ','すくすく'];
  animals constant text[] := array['ラッコ','クマ','パンダ','ネコ','リス','ウサギ','コアラ','カワウソ'];
  h text := md5(coalesce(p_seed, 'machimamo'));
  ai integer := 1 + (get_byte(decode(h, 'hex'), 0) % array_length(adjectives, 1));
  ni integer := 1 + (get_byte(decode(h, 'hex'), 1) % array_length(animals, 1));
  num integer := 1 + (get_byte(decode(h, 'hex'), 2) % 99);
begin
  return left(adjectives[ai] || animals[ni] || num::text, 8);
end;
$$;

create or replace function public.promote_guest_profile(
  p_name text default null,
  p_avatar text default null
)
returns table(id uuid, name text, point integer, avatar text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  candidate text;
  base_name text;
  avatar_value text;
  suffix integer := 1;
begin
  if uid is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.is_user_active(uid) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  select p.name into candidate from public.profiles p where p.auth_id = uid limit 1;
  if found then
    return query
      select p.id, p.name, coalesce(p.point, 0), p.avatar
      from public.profiles p where p.auth_id = uid limit 1;
    return;
  end if;

  base_name := btrim(coalesce(p_name, ''));
  if base_name = '' or base_name = '名無しドライバー' or char_length(base_name) > 10 then
    base_name := app_private.default_machimamo_name(uid::text);
  end if;
  candidate := base_name;

  avatar_value := btrim(coalesce(p_avatar, ''));
  if avatar_value = '' or char_length(avatar_value) > 16 or avatar_value like 'data:%' or avatar_value like 'image:%' then
    avatar_value := '🐾';
  end if;

  perform pg_advisory_xact_lock(hashtext('machimamo_profile_name'));
  while exists (
    select 1 from public.profiles p
    where lower(btrim(coalesce(p.name, ''))) = lower(candidate)
  ) loop
    suffix := suffix + 1;
    candidate := left(base_name, greatest(1, 10 - char_length(suffix::text))) || suffix::text;
    if suffix >= 999 then
      raise exception 'profile_name_generation_failed' using errcode = '54000';
    end if;
  end loop;

  insert into public.profiles(name, point, avatar, auth_id, linked_at)
  values(candidate, 0, avatar_value, uid, now());

  return query
    select p.id, p.name, coalesce(p.point, 0), p.avatar
    from public.profiles p where p.auth_id = uid limit 1;
end;
$$;

create or replace function public.update_my_profile(
  p_name text default null,
  p_avatar text default null
)
returns table(id uuid, name text, point integer, avatar text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name_value text;
  avatar_value text;
  object_path text;
begin
  if uid is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.is_user_active(uid) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  if p_name is not null then
    name_value := btrim(p_name);
    if name_value = '' or char_length(name_value) > 10 then
      raise exception 'invalid_name' using errcode = '22023';
    end if;
  end if;

  if p_avatar is not null then
    avatar_value := btrim(p_avatar);
    if avatar_value like 'image:%' then
      object_path := substring(avatar_value from 7);
      if object_path !~ ('^' || uid::text || '/avatar\\.(jpg|webp)$')
         or not exists (
           select 1 from storage.objects o
           where o.bucket_id = 'profile-avatars' and o.name = object_path
         ) then
        raise exception 'invalid_avatar_path' using errcode = '22023';
      end if;
    elsif avatar_value = '' or char_length(avatar_value) > 16 or avatar_value like 'data:%' then
      raise exception 'invalid_avatar' using errcode = '22023';
    end if;
  end if;

  return query
  update public.profiles p
     set name = case when p_name is null then p.name else name_value end,
         avatar = case when p_avatar is null then p.avatar else avatar_value end
   where p.auth_id = uid
  returning p.id, p.name, coalesce(p.point, 0), p.avatar;
end;
$$;

revoke all on function public.promote_guest_profile(text,text) from public;
revoke all on function public.update_my_profile(text,text) from public;
grant execute on function public.promote_guest_profile(text,text) to authenticated;
grant execute on function public.update_my_profile(text,text) to authenticated;

commit;
