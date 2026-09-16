-- Synthetic fixtures only. Run as owner; all writes including Auth deletion roll back.
-- Does NOT exercise real admin password, Storage HTTP, or Auth Admin HTTP endpoints.
begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); aid uuid:=gen_random_uuid();
 sid uuid:=gen_random_uuid(); appeal uuid; req bigint; job uuid; object_name text;
begin
 insert into auth.users(id,aud,role) values(u,'authenticated','authenticated'),(other_user,'authenticated','authenticated'),(aid,'authenticated','authenticated');
 insert into public.profiles(auth_id,name,point) select u,'開発22削除検証',0 where not exists(select 1 from public.profiles where auth_id=u);
 insert into public.admin_users(user_id,role,is_active) values(aid,'admin',true);
 object_name:=u::text||'/'||sid::text||'.jpg';
 perform set_config('request.jwt.claim.sub',u::text,true);
 set local role authenticated;
 insert into storage.objects(bucket_id,name) values('aed-submission-images',object_name);
 insert into public.aed_submissions(id,user_id,facility_name,installation_location,address,prefecture,
 latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,
 submitter_photo_license_accepted,privacy_confirmed,terms_version)
 values(sid,u,'検証専用施設','入口','東京都検証住所','東京都',35.68,139.76,10,object_name,repeat('c',64),640,480,true,true,'dev22-test');
 reset role;
 update public.aed_submissions set status='rejected',review_notes='検証用の否認' where id=sid;
 set local role authenticated;
 appeal:=public.submit_moderation_appeal('aed_submission',sid::text,'現地の設置状況について再確認をお願いします。');
 begin
  perform public.submit_moderation_appeal('aed_submission',upper(sid::text),'現地の設置状況について再確認をお願いします。');
  raise exception 'FAIL: duplicate appeal';
 exception when unique_violation then null; end;
 begin
  perform public.admin_begin_account_deletion('invalid',1);
  raise exception 'FAIL: nonadmin deletion';
 exception when insufficient_privilege then null; end;
 begin
  perform public.account_deletion_clean_data(gen_random_uuid());
  raise exception 'FAIL: client cleanup allowed';
 exception when insufficient_privilege then null; end;
 reset role;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 set local role authenticated;
 if exists(select 1 from public.moderation_appeals where id=appeal) then raise exception 'FAIL: other appeal visible'; end if;
 begin
  perform public.submit_moderation_appeal('aed_submission',sid::text,'現地の設置状況について再確認をお願いします。');
  raise exception 'FAIL: foreign target appeal';
 exception when insufficient_privilege then null; end;
 reset role;
 -- Fixture job: admin password success is intentionally not bypassed/tested.
 insert into public.account_deletion_requests(user_id,reason,status) values(u,'検証理由','processing') returning id into req;
 insert into public.account_deletion_jobs(request_id,user_id,started_by) values(req,u,aid) returning id into job;
 if public.is_user_active(u) then raise exception 'FAIL: deleting user active'; end if;
 begin
  update public.profiles set name='再作成不可' where auth_id=u;
  raise exception 'FAIL: profile write during deletion';
 exception when insufficient_privilege then null; end;
 begin
  perform public.account_deletion_clean_data(job);
  raise exception 'FAIL: cleanup with photos';
 exception when raise_exception then if sqlerrm<>'photos_remaining' then raise; end if; end;
 -- Only deletes the synthetic metadata row in this rollback transaction; no actual file exists.
 perform set_config('storage.allow_delete_query','true',true);
 delete from storage.objects where bucket_id='aed-submission-images' and name=object_name;
 perform public.account_deletion_clean_data(job);
 perform public.account_deletion_clean_data(job);
 if exists(select 1 from public.profiles where auth_id=u) or exists(select 1 from public.aed_submissions where user_id=u)
 or exists(select 1 from public.moderation_appeals where user_id=u) then raise exception 'FAIL: personal data remains'; end if;
 begin
  perform public.account_deletion_complete(job);
  raise exception 'FAIL: completed before Auth deletion';
 exception when raise_exception then if sqlerrm<>'auth_deletion_not_complete' then raise; end if; end;
 delete from auth.users where id=u;
 perform public.account_deletion_complete(job);
 perform public.account_deletion_complete(job);
 if not exists(select 1 from public.account_deletion_requests where id=req and status='completed' and user_id is null and reason is null) then raise exception 'FAIL: receipt not anonymized'; end if;
 if public.is_user_active(u) then raise exception 'FAIL: deleted JWT active'; end if;
end$$;
select 'PASS: own appeal, duplicate denial, foreign target/read denial, nonadmin/service denial, deletion guard, photo gate, idempotent cleanup, Auth gate, anonymous receipt, stale JWT denial; rollback' as result;
rollback;
