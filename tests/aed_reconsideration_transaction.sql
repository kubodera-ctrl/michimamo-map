-- Run with the migration in BEGIN/ROLLBACK first, or against applied schema.
-- Only synthetic fixture records are changed. No actual image objects are created/deleted.
begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid();
 sid uuid:=gen_random_uuid(); path text; appeal uuid; items jsonb; token uuid; state text;
begin
 insert into auth.users(id,aud,role) values(u,'authenticated','authenticated'),(other_user,'authenticated','authenticated'),(admin_id,'authenticated','authenticated');
 insert into public.profiles(auth_id,name,point) select u,'開発26再審査テスト',0 where not exists(select 1 from public.profiles where auth_id=u);
 insert into public.admin_users(user_id,role,is_active) values(admin_id,'admin',true);
 path:=u::text||'/'||sid::text||'.jpg';
 perform set_config('request.jwt.claim.sub',u::text,true);
 set local role authenticated;
 insert into storage.objects(bucket_id,name) values('aed-submission-images',path);
 insert into public.aed_submissions(id,user_id,facility_name,installation_location,address,prefecture,latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,submitter_photo_license_accepted,privacy_confirmed,terms_version)
 values(sid,u,'検証専用施設','入口','東京都検証住所','東京都',35.68,139.76,10,path,repeat('d',64),640,480,true,true,'dev26-reconsider-test');
 begin perform public.aed_retention_claim(20);raise exception 'FAIL: client cleanup';exception when insufficient_privilege then null;end;
 begin perform public.aed_retention_authorize(repeat('0',64));raise exception 'FAIL: client token check';exception when insufficient_privilege then null;end;
 reset role;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform public.admin_review_aed_submission(sid,'rejected',null,'現地写真にAEDが写っていません');
 if (select reconsider_until from public.aed_submissions where id=sid)<>now()+interval '7 days' then raise exception 'FAIL: seven day deadline';end if;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 set local role authenticated;
 begin perform public.submit_moderation_appeal('aed_submission',sid::text,'別ユーザーからの不正な申込テストです');raise exception 'FAIL: foreign request';exception when insufficient_privilege then null;end;
 reset role;
 perform set_config('request.jwt.claim.sub',u::text,true);
 set local role authenticated;
 appeal:=public.submit_moderation_appeal('aed_submission',sid::text,'写真の入口右側にAEDがあるため確認をお願いします');
 begin perform public.submit_moderation_appeal('aed_submission',upper(sid::text),'同じ投稿へ重複した再審査を申し込みます');raise exception 'FAIL: duplicate';exception when unique_violation then null;end;
 reset role;
 update public.aed_submissions set reconsider_until=now()-interval '1 day' where id=sid;
 set local role service_role;
 items:=public.aed_retention_claim(20);
 if exists(select 1 from jsonb_array_elements(items) x where x->>'id'=sid::text) then raise exception 'FAIL: pending appeal deleted';end if;
 reset role;
 -- Simulate an admin response; password-protected admin UI end-to-end remains manual.
 update public.aed_submissions set reviewed_at=now()+interval '1 second',review_notes='写真を確認しましたが元の判断を維持します' where id=sid;
 if not exists(select 1 from public.moderation_appeals where id=appeal and status='resolved') then raise exception 'FAIL: answered request remains pending';end if;
 set local role authenticated;
 appeal:=public.submit_moderation_appeal('aed_submission',sid::text,'返答後に補足の説明を添えて再審査を申し込みます');
 reset role;
 update public.moderation_appeals set status='resolved',outcome='reconsider',response='再審査で確認します',reviewed_at=now() where id=appeal;
 update public.aed_submissions set status='needs_review' where id=sid;
 if (select reconsider_until from public.aed_submissions where id=sid) is not null then raise exception 'FAIL: review retains expiry';end if;
 update public.aed_submissions set status='needs_changes',reviewed_at=now()-interval '7 days' where id=sid;
 set local role authenticated;
 begin perform public.submit_moderation_appeal('aed_submission',sid::text,'期限ちょうどでの受付拒否を検証しています');raise exception 'FAIL: expiry boundary';exception when insufficient_privilege then null;end;
 reset role;
 -- Approval and active review cannot be claimed even with an artificially stale deadline.
 update public.aed_submissions set status='approved_existing' where id=sid;
 set local role service_role;
 items:=public.aed_retention_claim(20);
 if exists(select 1 from jsonb_array_elements(items) x where x->>'id'=sid::text) then raise exception 'FAIL: approved deleted';end if;
 reset role;
 update public.aed_submissions set status='rejected',reviewed_at=now()-interval '8 days' where id=sid;
 set local role service_role;
 items:=public.aed_retention_claim(20);
 select (x->>'token')::uuid into token from jsonb_array_elements(items) x where x->>'id'=sid::text;
 if token is null then raise exception 'FAIL: expired not claimed';end if;
 if exists(select 1 from jsonb_array_elements(public.aed_retention_claim(20)) x where x->>'id'=sid::text) then raise exception 'FAIL: leased twice';end if;
 begin perform public.aed_retention_result(sid,gen_random_uuid(),true);raise exception 'FAIL: wrong token';exception when insufficient_privilege then null;end;
 state:=public.aed_retention_result(sid,token,true);
 if state<>'retry' or not exists(select 1 from public.aed_submissions where id=sid) then raise exception 'FAIL: deleted despite storage remaining';end if;
 reset role;
 begin update public.aed_submissions set status='needs_review' where id=sid;raise exception 'FAIL: restore during deletion';exception when insufficient_privilege then null;end;
 set local role authenticated;
 begin perform public.submit_moderation_appeal('aed_submission',sid::text,'削除開始後の受付拒否を検証しています');raise exception 'FAIL: late appeal';exception when insufficient_privilege then null;end;
 reset role;
 update app_private.aed_cleanup_jobs set leased_until=now()-interval '1 second' where submission_id=sid;
 set local role service_role;
 items:=public.aed_retention_claim(20);
 select (x->>'token')::uuid into token from jsonb_array_elements(items) x where x->>'id'=sid::text;
 reset role;
 perform set_config('storage.allow_delete_query','true',true);
 delete from storage.objects where bucket_id='aed-submission-images' and name=path;
 set local role service_role;
 state:=public.aed_retention_result(sid,token,true);
 if state<>'deleted' or exists(select 1 from public.aed_submissions where id=sid) then raise exception 'FAIL: cleanup incomplete';end if;
 if public.aed_retention_result(sid,token,true)<>'deleted' then raise exception 'FAIL: repeated finalization';end if;
 reset role;
 if exists(select 1 from public.moderation_appeals where target_type='aed_submission' and target_id=sid::text) then raise exception 'FAIL: appeal remains';end if;
 if not exists(select 1 from app_private.aed_expired_receipts where submission_id=sid) then raise exception 'FAIL: receipt absent';end if;
 if (select point from public.profiles where auth_id=u)<>0 then raise exception 'FAIL: re-review paid points';end if;
 set local role authenticated;
 begin insert into storage.objects(bucket_id,name) values('aed-submission-images',path);raise exception 'FAIL: expired image reuploaded';exception when insufficient_privilege then null;end;
 begin
 insert into public.aed_submissions(id,user_id,facility_name,installation_location,address,prefecture,latitude,longitude,gps_accuracy_m,photo_object_path,photo_sha256,photo_width,photo_height,submitter_photo_license_accepted,privacy_confirmed,terms_version)
 values(sid,u,'検証専用施設','入口','東京都検証住所','東京都',35.68,139.76,10,path,repeat('d',64),640,480,true,true,'dev26-reconsider-test');
 raise exception 'FAIL: expired request resurrected';
 exception when unique_violation then null;end;
 reset role;
 set local role anon;
 begin perform public.aed_retention_claim(20);raise exception 'FAIL: anonymous cleanup';exception when insufficient_privilege then null;end;
 reset role;
end$$;
select 'PASS: seven-day boundary, ownership, repeated requests, pending hold, approved hold, lease/retry/token, storage gate, deletion and replay guard, no points; ROLLBACK' as result;
rollback;
