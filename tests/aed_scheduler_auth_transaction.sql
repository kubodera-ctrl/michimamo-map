begin;
do $$begin
insert into app_private.aed_retention_nonces values(encode(extensions.digest(repeat('f',64),'sha256'),'hex'),now()+interval '1 minute');
set local role service_role;
if not public.aed_retention_authorize(repeat('f',64)) then raise exception 'valid token failed';end if;
if public.aed_retention_authorize(repeat('f',64)) then raise exception 'replay accepted';end if;
reset role;
insert into app_private.aed_retention_nonces values(encode(extensions.digest(repeat('f',64),'sha256'),'hex'),now()-interval '1 second');
set local role service_role;
if public.aed_retention_authorize(repeat('f',64)) then raise exception 'expired accepted';end if;
reset role;
end$$;select 'PASS: one-time scheduler token and expiry; rollback' as result;
rollback;

