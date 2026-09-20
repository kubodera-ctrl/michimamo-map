begin;

do $$
begin
  if (select exchange_enabled from public.point_exchange_settings where id) then
    raise exception 'beta exchange must remain disabled';
  end if;
  if (select processing_enabled from public.point_exchange_settings where id) then
    raise exception 'beta processing must remain disabled';
  end if;
  if (select count(*) from public.point_exchange_options where enabled) <> 2 then
    raise exception 'expected the 3000 and 5000 yen options';
  end if;
  if exists(select 1 from public.point_exchange_providers where logo_url is not null) then
    raise exception 'unapproved production logos must not be configured';
  end if;
end $$;

rollback;
