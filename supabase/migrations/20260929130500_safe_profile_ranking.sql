begin;

drop function if exists public.get_profile_ranking(integer);

create function public.get_profile_ranking(p_limit integer default 50)
returns table(
  name text,
  avatar text,
  point integer,
  is_me boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.name,
    p.avatar,
    coalesce(p.point, 0),
    coalesce(p.auth_id = auth.uid(), false)
  from public.profiles p
  where p.auth_id is not null
  order by coalesce(p.point, 0) desc, p.id
  limit least(greatest(coalesce(p_limit, 50), 1), 50);
$$;

revoke all on function public.get_profile_ranking(integer) from public;
grant execute on function public.get_profile_ranking(integer) to anon, authenticated;

commit;
