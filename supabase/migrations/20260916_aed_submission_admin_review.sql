begin;

create or replace function public.admin_get_aed_submissions(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  perform public.admin_validate(p_password);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb)
  into v_result
  from (
    select s.id, s.user_id, p.name as user_name, s.submission_kind,
      s.facility_name, s.installation_location, s.address, s.prefecture,
      s.latitude, s.longitude, s.gps_accuracy_m, s.photo_object_path,
      s.nearby_candidate_ids, s.matched_safety_spot_id, s.fraud_flags,
      s.status, s.created_at
    from public.aed_submissions s
    left join public.profiles p on p.auth_id = s.user_id
    where s.status in ('pending','needs_review','needs_changes')
    order by s.created_at
    limit 100
  ) x;
  return v_result;
end;
$$;

create or replace function public.admin_review_aed_submission_secure(
  p_password text,
  p_submission_id uuid,
  p_decision text,
  p_existing_safety_spot_id bigint default null,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_validate(p_password);
  return public.admin_review_aed_submission(
    p_submission_id, p_decision, p_existing_safety_spot_id, p_review_notes
  );
end;
$$;

revoke all on function public.admin_get_aed_submissions(text) from public, anon, authenticated;
revoke all on function public.admin_review_aed_submission(uuid,text,bigint,text) from public, anon, authenticated;
revoke all on function public.admin_review_aed_submission_secure(text,uuid,text,bigint,text) from public, anon, authenticated;
grant execute on function public.admin_get_aed_submissions(text) to authenticated;
grant execute on function public.admin_review_aed_submission_secure(text,uuid,text,bigint,text) to authenticated;

commit;
