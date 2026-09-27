-- Explicitly remove Supabase's automatic anon EXECUTE grants and silence
-- no-policy warnings with deny-all policies. RPCs remain the only access path.

revoke execute on function public.get_point_exchange_catalog() from anon;
revoke execute on function public.get_my_point_exchange_history() from anon;
revoke execute on function public.request_point_exchange(text,uuid,jsonb) from anon;
revoke execute on function public.admin_list_point_exchanges(text,text) from anon;
revoke execute on function public.admin_transition_point_exchange(text,uuid,text,text,text,text) from anon;

create policy point_exchange_settings_no_direct_access
  on public.point_exchange_settings for all to anon,authenticated
  using (false) with check (false);
create policy point_exchange_options_no_direct_access
  on public.point_exchange_options for all to anon,authenticated
  using (false) with check (false);
create policy point_exchange_providers_no_direct_access
  on public.point_exchange_providers for all to anon,authenticated
  using (false) with check (false);
create policy point_exchange_requests_no_direct_access
  on public.point_exchange_requests for all to anon,authenticated
  using (false) with check (false);

create index point_exchange_requests_option_idx
  on public.point_exchange_requests(option_id);
