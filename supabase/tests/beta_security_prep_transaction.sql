\set ON_ERROR_STOP on

begin;

insert into public.profiles (id, auth_id, name, avatar, point)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'A', '👤', 200),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'B', '👤', 100);

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  i integer;
  row_data record;
begin
  for i in 1..10 loop
    select * into row_data
    from public.consume_edge_rate_limit(
      'line-auth',
      repeat('a', 64),
      10,
      60
    );

    if row_data.allowed is not true then
      raise exception 'request % should be allowed', i;
    end if;

    if row_data.request_count <> i then
      raise exception 'request_count expected %, got %', i, row_data.request_count;
    end if;
  end loop;

  select * into row_data
  from public.consume_edge_rate_limit(
    'line-auth',
    repeat('a', 64),
    10,
    60
  );

  if row_data.allowed is not false or row_data.request_count <> 11 then
    raise exception '11th request should be denied: %', row_to_json(row_data);
  end if;

  select * into row_data
  from public.consume_edge_rate_limit(
    'line-auth',
    repeat('b', 64),
    10,
    60
  );

  if row_data.allowed is not true or row_data.request_count <> 1 then
    raise exception 'different subject must have independent bucket';
  end if;
end
$$;

select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  perform *
  from public.consume_edge_rate_limit(
    'line-auth',
    repeat('c', 64),
    10,
    60
  );
  raise exception 'authenticated role unexpectedly consumed service limiter';
exception
  when insufficient_privilege then
    null;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  '20000000-0000-0000-0000-000000000002',
  true
);

do $$
declare
  me_count integer;
  result_signature text;
begin
  select count(*) into me_count
  from public.get_profile_ranking(50)
  where is_me;

  if me_count <> 1 then
    raise exception 'expected exactly one is_me row, got %', me_count;
  end if;

  select pg_get_function_result(
    'public.get_profile_ranking(integer)'::regprocedure
  )
  into result_signature;

  if result_signature ~* '(^|[, (])id[ ,)]' then
    raise exception 'ranking result still exposes id: %', result_signature;
  end if;

  if result_signature !~* 'is_me boolean' then
    raise exception 'ranking result missing is_me: %', result_signature;
  end if;
end
$$;

select set_config('request.jwt.claim.sub', '', true);

do $$
declare
  me_count integer;
begin
  select count(*) into me_count
  from public.get_profile_ranking(50)
  where is_me;

  if me_count <> 0 then
    raise exception 'anonymous ranking must not mark is_me';
  end if;
end
$$;

rollback;
