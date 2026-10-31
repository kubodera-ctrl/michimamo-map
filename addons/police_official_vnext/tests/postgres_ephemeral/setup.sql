-- EPHEMERAL POSTGRES ONLY: fake existing MAP auth schema/roles in CI container.
-- NEVER execute this fixture on any Supabase project.
do $$begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls;end if;
end$$;
grant usage on schema public to anon,authenticated,service_role;
create schema if not exists auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('machimamo.test_uid',true),'')::uuid
$$;
create function public.admin_validate(p_password text) returns void language plpgsql as $$
begin
 if p_password is distinct from 'EXAMPLE_TEST_PASSWORD_ONLY' then raise exception 'bad_password';end if;
end;$$;
create function public.is_current_user_admin() returns boolean language sql stable as $$
  select auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
$$;
create table public.admin_audit_log(
 id bigint generated always as identity primary key,
 action text not null,target_type text not null,target_id text not null,
 detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 actor_user_id uuid
);
