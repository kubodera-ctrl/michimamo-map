begin;
revoke all on function public.promote_guest_profile(text,text) from anon;
revoke all on function public.update_my_profile(text,text) from anon;
grant execute on function public.promote_guest_profile(text,text) to authenticated;
grant execute on function public.update_my_profile(text,text) to authenticated;
commit;
