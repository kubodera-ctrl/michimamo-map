begin;
do $$
declare
  u1 uuid:='aaaaaaaa-1111-1111-1111-111111111111';
  u2 uuid:='bbbbbbbb-2222-2222-2222-222222222222';
  req uuid;
  payload jsonb;
  r jsonb;
  first_id bigint;
  i integer;
begin
  insert into auth.users(id) values(u1),(u2);
  insert into public.profiles(auth_id,name,point) values(u1,'owner',0),(u2,'other',0);
  perform set_config('request.jwt.claim.sub',u1::text,true);

  for i in 1..6 loop
    req:=('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid;
    payload:=jsonb_build_object(
      'lat',35.62+i/10000.0,'lng',139.77,
      'category','local_anomaly','anomaly_type','road_damage',
      'title','道路の異変'||i,'comment','fixture','address','東京都テスト','source','map'
    );
    r:=app_private.submit_spot_once(req,payload);
    if i=1 then first_id:=(r->>'id')::bigint; end if;
    if i<=5 and (r->>'awarded')::int<>1 then raise exception 'expected_1pt_% %',i,r; end if;
    if i=6 and (r->>'awarded')::int<>0 then raise exception 'expected_0pt_cap %',r; end if;
  end loop;

  if (select point from public.profiles where auth_id=u1)<>5 then raise exception 'daily_cap_balance_failed'; end if;
  if (select count(*) from public.point_transactions where user_id=u1 and reason='spot_post')<>5 then
    raise exception 'daily_cap_ledger_failed';
  end if;

  req:='10000000-0000-0000-0000-000000000001'::uuid;
  payload:=jsonb_build_object(
    'lat',35.6201,'lng',139.77,'category','local_anomaly','anomaly_type','road_damage',
    'title','道路の異変1','comment','fixture','address','東京都テスト','source','map'
  );
  r:=app_private.submit_spot_once(req,payload);
  if (r->>'id')::bigint<>first_id or (r->>'replayed')::boolean is not true then
    raise exception 'receipt_replay_failed %',r;
  end if;
  if (select count(*) from public.spots where created_by=u1)<>6 then raise exception 'replay_created_duplicate'; end if;

  begin
    perform app_private.submit_spot_once(req,payload||jsonb_build_object('title','changed'));
    raise exception 'expected_payload_mismatch';
  exception when raise_exception then
    if sqlerrm<>'request_payload_mismatch' then raise; end if;
  end;

  begin
    perform app_private.submit_spot_once(
      gen_random_uuid(),
      jsonb_build_object('lat',35.6,'lng',139.7,'category','local_anomaly','title','missing type','source','map')
    );
    raise exception 'expected_invalid_anomaly';
  exception when raise_exception then
    if sqlerrm<>'invalid_post' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub',u2::text,true);
  if public.delete_my_spot(first_id) then raise exception 'other_user_deleted_spot'; end if;
  perform set_config('request.jwt.claim.sub',u1::text,true);
  if not public.delete_my_spot(first_id) then raise exception 'owner_delete_failed'; end if;
  if exists(select 1 from public.spots where id=first_id) then raise exception 'owner_delete_not_removed'; end if;
end $$;
rollback;
select 'PASS: local_anomaly create/1pt cap/receipt replay/payload mismatch/validation/owner delete' result;
