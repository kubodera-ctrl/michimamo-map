begin;
do $$
declare
 u uuid := gen_random_uuid();
 a uuid := gen_random_uuid();
 sid uuid;
 obj text;
 i integer;
 v_result jsonb;
 v_week timestamptz := date_trunc('week',now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo';
begin
 insert into auth.users(id,aud,role) values(u,'authenticated','authenticated'),(a,'authenticated','authenticated');
 insert into public.profiles(auth_id,name,point) select u,'dev23 quota rollback test',0 where not exists(select 1 from public.profiles where auth_id=u);
 insert into public.admin_users(user_id,role,is_active) values(a,'admin',true);
 perform set_config('request.jwt.claim.sub',u::text,true);
 obj := u::text||'/quota.jpg';
 insert into storage.objects(bucket_id,name) values('aed-submission-images',obj);
 set local role authenticated;
 for i in 1..11 loop
  begin
   insert into public.aed_submissions(user_id,facility_name,installation_location,address,prefecture,latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,submitter_photo_license_accepted,privacy_confirmed,terms_version)
   values(u,'検証施設','入口','東京都検証住所','東京都',35.68+i*0.001,139.76,10,obj,md5(u::text||i::text)||md5(i::text),640,480,true,true,'dev23-test') returning id into sid;
   if i=11 then raise exception 'FAIL daily accepted 11'; end if;
  exception when raise_exception then
   if i<>11 or sqlerrm<>'aed_daily_limit' then raise; end if;
  end;
 end loop;
 reset role;
 -- Prior-week submissions should not consume the current quota.
 update public.aed_submissions set created_at=v_week-interval '1 day' where user_id=u;
 set local role authenticated;
 for i in 12..21 loop
  insert into public.aed_submissions(user_id,facility_name,installation_location,address,prefecture,latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,submitter_photo_license_accepted,privacy_confirmed,terms_version)
  values(u,'検証施設','入口','東京都検証住所','東京都',35.68+i*0.001,139.76,10,obj,md5(u::text||i::text)||md5(i::text),640,480,true,true,'dev23-test');
 end loop;
 reset role;
 -- Bring all 20 fixtures into the current week. Rejected posts still count.
 update public.aed_submissions set created_at=v_week,status='rejected' where user_id=u;
 set local role authenticated;
 begin
  insert into public.aed_submissions(user_id,facility_name,installation_location,address,prefecture,latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,submitter_photo_license_accepted,privacy_confirmed,terms_version)
  values(u,'検証施設','入口','東京都検証住所','東京都',35.72,139.76,10,obj,repeat('f',64),640,480,true,true,'dev23-test');
  raise exception 'FAIL weekly accepted 21';
 exception when raise_exception then
  if sqlerrm<>'aed_weekly_limit' then raise; end if;
 end;
 reset role;
 -- Approval of an already accepted prior-week submission is not quota-limited.
 update public.aed_submissions set status='pending',created_at=v_week-interval '1 day' where id=sid;
 perform set_config('request.jwt.claim.sub',a::text,true);
 v_result:=public.admin_review_aed_submission(sid,'approved_new',null,'dev23 rollback');
 if (v_result->>'awardedPoints')::integer<>30 then raise exception 'FAIL reward'; end if;
 begin
  perform public.admin_review_aed_submission(sid,'approved_new',null,null);
  raise exception 'FAIL double approval';
 exception when unique_violation then null;
 end;
 if (select count(*) from public.point_transactions where user_id=u and reason='aed_new_approval')<>1 then raise exception 'FAIL duplicate reward';end if;
end $$;
select 'PASS: daily 10/11; previous week reset; weekly 20/21 including rejected; delayed approval 30pt exactly once; all fixtures rolled back' as result;
rollback;
