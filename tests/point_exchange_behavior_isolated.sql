-- Actual isolated DB behavior test. The workflow loads the existing exchange
-- migrations and the new additive reason/balance migration before this file.

begin;

do $$
declare
  u1 uuid:='11111111-1111-1111-1111-111111111111';
  u2 uuid:='22222222-2222-2222-2222-222222222222';
  u3 uuid:='33333333-3333-3333-3333-333333333333';
  u4 uuid:='44444444-4444-4444-4444-444444444444';
  k1 uuid:='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  k2 uuid:='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  k3 uuid:='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  k4 uuid:='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  k5 uuid:='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
  r jsonb;
  rid uuid;
  first_id uuid;
  bal jsonb;
  before_count integer;
begin
  insert into auth.users(id) values(u1),(u2),(u3),(u4);
  insert into public.profiles(auth_id,name,point) values
    (u1,'issue-flow',50000),(u2,'cancel-reject',50000),
    (u3,'fail-retry',50000),(u4,'insufficient',20000);

  update public.point_exchange_settings
    set exchange_enabled=true,processing_enabled=true
  where id;

  perform set_config('request.jwt.claim.sub',u1::text,true);
  r:=public.request_point_exchange('digital-gift-3000',k1,null);
  rid:=(r->>'id')::uuid;
  first_id:=rid;
  if r->>'status'<>'points_reserved' then raise exception 'reserve_status_failed %',r; end if;
  bal:=public.get_my_point_balance();
  if (bal->>'gross')::int<>50000 or (bal->>'reserved')::int<>30000 or (bal->>'available')::int<>20000 then
    raise exception 'balance_projection_after_reserve_failed %',bal;
  end if;

  r:=public.request_point_exchange('digital-gift-3000',k1,null);
  if (r->>'id')::uuid<>first_id or (r->>'idempotent')::boolean is not true then
    raise exception 'idempotency_replay_failed %',r;
  end if;
  if (select count(*) from public.point_exchange_requests where user_id=u1)<>1 then
    raise exception 'idempotency_duplicate_row';
  end if;

  begin
    perform public.request_point_exchange('digital-gift-3000',k2,null);
    raise exception 'expected_insufficient_available';
  exception when numeric_value_out_of_range then null;
  end;

  r:=public.admin_transition_point_exchange('test-admin',rid,'approve',null,null,null);
  if r->>'status'<>'approved' then raise exception 'approve_failed %',r; end if;
  r:=public.admin_transition_point_exchange('test-admin',rid,'start_issuing',null,null,null);
  if r->>'status'<>'issuing' then raise exception 'issuing_failed %',r; end if;
  r:=public.admin_transition_point_exchange(
    'test-admin',rid,'mark_issued','provider-issue-001','https://example.invalid/claim/001',null
  );
  if r->>'status'<>'issued' then raise exception 'issued_failed %',r; end if;
  if (select point from public.profiles where auth_id=u1)<>20000 then
    raise exception 'final_ledger_deduction_failed';
  end if;
  if not exists(
    select 1 from public.point_transactions
    where user_id=u1 and reason='point_exchange' and ref_key=rid::text and amount=-30000
  ) then raise exception 'point_exchange_ledger_missing'; end if;
  if (select points_committed_at is null from public.point_exchange_requests where id=rid) then
    raise exception 'points_committed_at_missing';
  end if;
  if (select external_issue_id from public.point_exchange_requests where id=rid)<>'provider-issue-001' then
    raise exception 'external_issue_id_missing';
  end if;
  if not exists(
    select 1 from app_private.point_exchange_deliveries
    where request_id=rid and external_issue_id='provider-issue-001'
  ) then raise exception 'delivery_request_link_missing'; end if;
  bal:=public.get_my_point_balance();
  if (bal->>'gross')::int<>20000 or (bal->>'reserved')::int<>0 or (bal->>'available')::int<>20000 then
    raise exception 'balance_projection_after_issue_failed %',bal;
  end if;

  select count(*) into before_count from public.point_transactions
    where user_id=u1 and reason='point_exchange' and ref_key=rid::text;
  begin
    perform public.admin_transition_point_exchange(
      'test-admin',rid,'mark_issued','provider-issue-001','https://example.invalid/claim/001',null
    );
    raise exception 'expected_double_issue_reject';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.point_transactions
      where user_id=u1 and reason='point_exchange' and ref_key=rid::text)<>before_count then
    raise exception 'double_issue_changed_ledger';
  end if;

  perform set_config('request.jwt.claim.sub',u2::text,true);
  r:=public.request_point_exchange('digital-gift-3000',k2,null); rid:=(r->>'id')::uuid;
  r:=public.admin_transition_point_exchange('test-admin',rid,'cancel',null,null,'user_cancel');
  if r->>'status'<>'cancelled' then raise exception 'cancel_failed %',r; end if;
  bal:=public.get_my_point_balance();
  if (bal->>'available')::int<>50000 or exists(
    select 1 from public.point_transactions where user_id=u2 and reason='point_exchange' and ref_key=rid::text
  ) then raise exception 'cancel_balance_or_ledger_failed %',bal; end if;

  r:=public.request_point_exchange('digital-gift-3000',k3,null); rid:=(r->>'id')::uuid;
  r:=public.admin_transition_point_exchange('test-admin',rid,'reject',null,null,'review_reject');
  if r->>'status'<>'rejected' then raise exception 'reject_failed %',r; end if;

  perform set_config('request.jwt.claim.sub',u3::text,true);
  r:=public.request_point_exchange('digital-gift-3000',k4,null); rid:=(r->>'id')::uuid;
  perform public.admin_transition_point_exchange('test-admin',rid,'approve',null,null,null);
  perform public.admin_transition_point_exchange('test-admin',rid,'start_issuing',null,null,null);
  r:=public.admin_transition_point_exchange('test-admin',rid,'mark_failed',null,null,'provider_timeout');
  if r->>'status'<>'issue_failed' then raise exception 'issue_failed_transition_failed %',r; end if;
  r:=public.admin_transition_point_exchange('test-admin',rid,'retry',null,null,null);
  if r->>'status'<>'approved' then raise exception 'retry_failed %',r; end if;
  perform public.admin_transition_point_exchange('test-admin',rid,'start_issuing',null,null,null);
  perform public.admin_transition_point_exchange(
    'test-admin',rid,'mark_issued','provider-issue-003','https://example.invalid/claim/003',null
  );
  if (select point from public.profiles where auth_id=u3)<>20000 then
    raise exception 'retry_final_deduction_failed';
  end if;

  perform set_config('request.jwt.claim.sub',u4::text,true);
  begin
    perform public.request_point_exchange('digital-gift-3000',k5,null);
    raise exception 'expected_insufficient_balance';
  exception when numeric_value_out_of_range then null;
  end;
end $$;

rollback;

select 'PASS: reserve/available/idempotency/approve/issuing/issued/ledger/commit/external/delivery/double-issued/cancel/reject/failed/retry/insufficient' as result;
