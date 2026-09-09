begin;

alter table public.spots
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.spots enable row level security;
alter table public.profiles enable row level security;

drop policy if exists allow_delete_all on public.spots;
drop policy if exists allow_insert_all on public.spots;
drop policy if exists allow_select_all on public.spots;
drop policy if exists allow_update_all on public.spots;

create policy spots_public_read
on public.spots for select
to anon, authenticated
using (true);

create policy spots_authenticated_insert
on public.spots for insert
to authenticated
with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists profiles_owner_read on public.profiles;
drop policy if exists profiles_owner_update on public.profiles;

create policy profiles_owner_read
on public.profiles for select
to authenticated
using (auth_id = auth.uid());

create policy profiles_owner_update
on public.profiles for update
to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

revoke all on table public.spots from anon, authenticated;
grant select on table public.spots to anon, authenticated;
grant insert on table public.spots to authenticated;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (name, avatar) on table public.profiles to authenticated;

create table if not exists public.spot_votes (
  spot_id bigint not null references public.spots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like', 'report', 'confirm')),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id, kind)
);

alter table public.spot_votes enable row level security;
revoke all on table public.spot_votes from anon, authenticated;

create or replace function public.vote_spot(p_spot_id bigint, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_kind not in ('like', 'report', 'confirm') then
    raise exception 'invalid_vote_kind' using errcode = '22023';
  end if;

  insert into public.spot_votes (spot_id, user_id, kind)
  values (p_spot_id, v_user_id, p_kind)
  on conflict do nothing;

  if not found then
    raise exception 'already_voted' using errcode = '23505';
  end if;

  if p_kind = 'like' then
    update public.spots set like_count = coalesce(like_count, 0) + 1 where id = p_spot_id
    returning like_count into v_count;
  elsif p_kind = 'report' then
    update public.spots set report_count = coalesce(report_count, 0) + 1 where id = p_spot_id
    returning report_count into v_count;
  else
    update public.spots set confirm_count = coalesce(confirm_count, 0) + 1 where id = p_spot_id
    returning confirm_count into v_count;
  end if;

  if v_count is null then
    raise exception 'spot_not_found' using errcode = 'P0002';
  end if;

  return v_count;
end;
$$;

create or replace function public.delete_my_spot(p_spot_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  delete from public.spots
  where id = p_spot_id and created_by = auth.uid();

  return found;
end;
$$;

create or replace function public.get_profile_ranking(p_limit integer default 50)
returns table(id uuid, name text, avatar text, point integer)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.avatar, coalesce(p.point, 0)
  from public.profiles p
  where p.auth_id is not null
  order by coalesce(p.point, 0) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 50);
$$;

revoke all on function public.vote_spot(bigint, text) from public;
revoke all on function public.delete_my_spot(bigint) from public;
revoke all on function public.get_profile_ranking(integer) from public;
grant execute on function public.vote_spot(bigint, text) to authenticated;
grant execute on function public.delete_my_spot(bigint) to authenticated;
grant execute on function public.get_profile_ranking(integer) to anon, authenticated;

commit;
