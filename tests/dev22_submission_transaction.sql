-- Run as the DB owner. All fixtures and outcomes roll back; no real user is changed.
begin;
do $$
declare
  u uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  submission_id uuid := gen_random_uuid();
  object_name text;
  result jsonb;
  spot_id bigint;
begin
  insert into auth.users(id,aud,role) values(u,'authenticated','authenticated'),(admin_id,'authenticated','authenticated');
  insert into public.profiles(auth_id,name,point) select u,'開発22トランザクション内検証',0
    where not exists(select 1 from public.profiles where auth_id=u);
  insert into public.admin_users(user_id,role,is_active) values(admin_id,'admin',true);
  object_name := u::text || '/' || submission_id::text || '.jpg';
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  insert into storage.objects(bucket_id,name) values('aed-submission-images',object_name);
  insert into storage.objects(bucket_id,name) values('spot-images',u::text||'/dev22.jpg');
  begin
    insert into storage.objects(bucket_id,name) values('spot-images',admin_id::text||'/dev22.jpg');
    raise exception 'FAIL: another user folder allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.aed_submissions(user_id,facility_name,installation_location,address,prefecture,
      latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,
      submitter_photo_license_accepted,privacy_confirmed,terms_version)
    values(u,'検証施設','入口','東京都検証住所','東京都',35.68,139.76,10,u::text||'/missing.jpg',repeat('1',64),640,480,true,true,'dev22-test');
    raise exception 'FAIL: missing photo accepted';
  exception when insufficient_privilege then null;
  end;
  insert into public.aed_submissions(id,user_id,facility_name,installation_location,address,prefecture,
      latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,
      submitter_photo_license_accepted,privacy_confirmed,terms_version)
    values(submission_id,u,'検証施設','入口','東京都検証住所','東京都',35.68,139.76,10,object_name,repeat('2',64),640,480,true,true,'dev22-test');
  if (select status from public.aed_submissions where id=submission_id) <> 'pending' then
    raise exception 'FAIL: initial status not pending';
  end if;
  reset role;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  result := public.admin_review_aed_submission(submission_id,'approved_new',null,'開発22ロールバック検証');
  spot_id := (result->>'safetySpotId')::bigint;
  if (result->>'awardedPoints')::int <> 30 or (select point from public.profiles where auth_id=u)<>30 then
    raise exception 'FAIL: incorrect reward';
  end if;
  if not exists(select 1 from public.admin_audit_log where target_id=submission_id::text and actor_user_id=admin_id) then
    raise exception 'FAIL: audit missing';
  end if;
  begin
    perform public.admin_review_aed_submission(submission_id,'approved_new',null,null);
    raise exception 'FAIL: repeated approval allowed';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.point_transactions where user_id=u and reason='aed_new_approval') <> 1 then
    raise exception 'FAIL: duplicate reward';
  end if;
  perform set_config('request.jwt.claim.sub',u::text,true);
  set local role authenticated;
  if (select status from public.aed_submissions where id=submission_id)<>'approved_new' then
    raise exception 'FAIL: owner cannot read result';
  end if;
  reset role;
end $$;
select 'PASS: own uploads accepted, foreign folder/missing photo denied, normal submission and review successful, 30pt once, audit and owner history verified; all test data rolled back' as result;
rollback;
