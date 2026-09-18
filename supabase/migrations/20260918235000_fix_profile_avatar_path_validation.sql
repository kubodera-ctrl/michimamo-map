-- Development 29: fix authenticated avatar path validation.
begin;

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
      if object_path !~ ('^' || uid::text || '/avatar[.](jpg|webp)$')
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

revoke all on function public.update_my_profile(text,text) from public;
grant execute on function public.update_my_profile(text,text) to authenticated;

commit;