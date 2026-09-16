-- Development 22: preserve public reads while restricting write/review boundaries.
begin;
revoke execute on function public.claim_quiz_points(integer), public.delete_my_spot(bigint),
  public.get_my_dashboard(), public.is_current_user_admin(), public.is_user_active(uuid),
  public.play_gacha(), public.request_account_deletion(text), public.vote_spot(bigint,text)
  from public, anon;
revoke execute on function public.award_spot_post_points(), public.enforce_active_spot_vote()
  from public, anon, authenticated;

-- Clients can provide evidence but cannot self-approve or forge a review.
revoke insert on public.aed_submissions from authenticated;
grant insert (id,user_id,submission_kind,facility_name,installation_location,address,prefecture,
  municipality,latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,
  photo_height,photo_captured_at,nearby_candidate_ids,matched_safety_spot_id,
  submitter_photo_license_accepted,privacy_confirmed,terms_version)
  on public.aed_submissions to authenticated;

-- Existing public photo URLs remain readable. Only active authenticated users may upload.
drop policy if exists "allow_uploads a3ji5f_0" on storage.objects;
create policy spot_images_authenticated_insert on storage.objects for insert to authenticated
with check (bucket_id = 'spot-images' and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text and public.is_user_active(auth.uid()));
update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'] where id = 'spot-images';

drop policy if exists aed_submission_images_owner_insert on storage.objects;
create policy aed_submission_images_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'aed-submission-images' and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_user_active(auth.uid()));

create or replace function public.prepare_aed_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_duplicate uuid;
  v_same_location_count integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.is_user_active(auth.uid()) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  -- Review fields and timestamps belong to the server, never the submitter.
  new.status := 'pending';
  new.fraud_flags := '{}';
  new.duplicate_of_submission_id := null;
  new.review_notes := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  new.updated_at := now();
  if split_part(new.photo_object_path, '/', 1) <> auth.uid()::text
     or not exists(select 1 from storage.objects o
       where o.bucket_id = 'aed-submission-images' and o.name = new.photo_object_path) then
    raise exception 'owned_photo_required' using errcode = '42501';
  end if;

  select s.id into v_duplicate
  from public.aed_submissions s
  where s.photo_sha256 = new.photo_sha256
  order by s.created_at
  limit 1;
  if v_duplicate is not null then
    new.duplicate_of_submission_id := v_duplicate;
    new.fraud_flags := array_append(new.fraud_flags, 'duplicate_photo');
  end if;

  select count(*) into v_same_location_count
  from public.aed_submissions s
  where s.user_id = new.user_id
    and s.created_at >= now() - interval '24 hours'
    and abs(s.latitude - new.latitude) < 0.00005
    and abs(s.longitude - new.longitude) < 0.00005;
  if v_same_location_count >= 2 then
    new.fraud_flags := array_append(new.fraud_flags, 'coordinate_velocity');
  end if;
  if new.gps_accuracy_m > 100 then
    new.fraud_flags := array_append(new.fraud_flags, 'low_gps_accuracy');
  end if;
  if cardinality(new.fraud_flags) > 0 then
    new.status := 'needs_review';
  end if;
  return new;
end;
$$;


commit;
