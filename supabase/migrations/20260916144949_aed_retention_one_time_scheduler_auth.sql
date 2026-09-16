-- Hosted pg_net is owned by supabase_admin; postgres cannot revoke its PUBLIC
-- queue grants. Do not put a long-lived credential into that queue. Every cron
-- invocation receives a single-use 256-bit token, valid for two minutes only.
create table app_private.aed_retention_nonces(
 token_hash text primary key, expires_at timestamptz not null
);
alter table app_private.aed_retention_nonces enable row level security;
revoke all on app_private.aed_retention_nonces from public,anon,authenticated;
create or replace function app_private.aed_retention_authorize(p_token text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare accepted boolean;
begin
 if p_token !~ '^[0-9a-f]{64}$' then return false;end if;
 delete from app_private.aed_retention_nonces
  where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now()
  returning true into accepted;
 return coalesce(accepted,false);
end$$;
create or replace function public.aed_retention_authorize(p_token text) returns boolean
language sql volatile security invoker set search_path='' as $$select app_private.aed_retention_authorize(p_token)$$;
create or replace function app_private.invoke_aed_retention() returns bigint
language plpgsql security definer set search_path='' as $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex');rid bigint;
begin
 delete from app_private.aed_retention_nonces where expires_at<=now();
 insert into app_private.aed_retention_nonces(token_hash,expires_at)
  values(encode(extensions.digest(token,'sha256'),'hex'),now()+interval '2 minutes');
 select net.http_post(
  url:='https://ckftozjhdszlwqnylmxv.supabase.co/functions/v1/aed-retention',
  headers:=jsonb_build_object('Content-Type','application/json','x-retention-token',token),
  body:='{}'::jsonb,timeout_milliseconds:=60000) into rid;
 return rid;
end$$;
-- Delete only the secret created by this feature; it is no longer accepted.
delete from vault.secrets where name='aed_retention_cron_token';
