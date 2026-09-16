do $$
declare u uuid:=gen_random_uuid();a uuid:=gen_random_uuid();e uuid;path text;token uuid;batch jsonb;r jsonb;
begin
 insert into auth.users(id,aud,role) values(u,'authenticated','authenticated'),(a,'authenticated','authenticated');
 insert into public.profiles(auth_id,name,point) values(u,'evidence fixture',0);
 insert into public.admin_users(user_id,role,is_active) values(a,'admin',true);
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
 r:=public.prepare_camera_evidence(null);e:=(r->>'id')::uuid;path:=r->>'object_path';
 if path not like u::text||'/%/original.jpg' then raise exception 'FAIL path';end if;
 begin perform public.finalize_camera_evidence(e,repeat('a',64),1000,800,true);raise exception 'FAIL finalized without object';exception when raise_exception then if sqlerrm<>'upload_not_found' then raise;end if;end;
 begin perform public.admin_camera_evidence('wrong','list','{}');raise exception 'FAIL user admin';exception when insufficient_privilege then null;end;
 begin perform public.camera_evidence_cleanup_batch(50);raise exception 'FAIL user cleanup';exception when insufficient_privilege then null;end;
 reset role;
 insert into storage.objects(bucket_id,name,owner_id,metadata) values('camera-evidence',path,u::text,jsonb_build_object('size',1000,'mimetype','image/jpeg'));
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;
 perform public.finalize_camera_evidence(e,repeat('a',64),1000,800,true);
 if (select normal_delete_at-finalized_at from public.camera_evidence where id=e)<>interval '10 days' then raise exception 'FAIL ten days';end if;
 begin update public.camera_evidence set state='deleted' where id=e;raise exception 'FAIL direct update';exception when insufficient_privilege then null;end;
 reset role;
 -- Directly exercise post-auth admin operation; real password success is not bypassed.
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform app_private.camera_evidence_admin_operation('preserve',jsonb_build_object('id',e,'reason','fixture preservation reason'));
 if (select preserve_until from public.camera_evidence where id=e) not between now()+interval '39 days 23 hours' and now()+interval '40 days 1 hour' then raise exception 'FAIL 30d extension after base deadline';end if;
 update public.camera_evidence set preserve_until=now()-interval '1 second' where id=e;
 update app_private.camera_cleanup_control set last_started_at=null where task='retention';
 batch:=public.camera_evidence_cleanup_batch(50);
 if (select state from public.camera_evidence where id=e)<>'decision_due' then raise exception 'FAIL decision due';end if;
 if (select decision_due_at from public.camera_evidence where id=e) not between now()+interval '6 days 23 hours' and now()+interval '7 days 1 hour' then raise exception 'FAIL seven days';end if;
 perform app_private.camera_evidence_admin_operation('extend',jsonb_build_object('id',e,'reason','fixture extension reason'));
 if (select preserve_until from public.camera_evidence where id=e) not between now()+interval '29 days 23 hours' and now()+interval '30 days 1 hour' then raise exception 'FAIL extend';end if;
 update public.camera_evidence set state='decision_due',decision_due_at=now()-interval '1 second' where id=e;
 update public.camera_evidence set decision_due_at=now()-interval '1 second' where id=e;
 update app_private.camera_cleanup_control set last_started_at=null where task='retention';batch:=public.camera_evidence_cleanup_batch(50);
 token:=(batch->>'token')::uuid;if jsonb_array_length(batch->'items')<>1 then raise exception 'FAIL cleanup queue %',batch;end if;
 perform public.camera_evidence_cleanup_result(e,token,false,'storage_delete_failed');
 if (select state from public.camera_evidence where id=e)<>'delete_failed' then raise exception 'FAIL retry';end if;
 update app_private.camera_cleanup_control set last_started_at=null where task='retention';batch:=public.camera_evidence_cleanup_batch(50);token:=(batch->>'token')::uuid;
 perform public.camera_evidence_cleanup_result(e,token,true,null);
 if exists(select 1 from public.camera_evidence where id=e and (state<>'deleted' or object_path is not null or user_id is not null or sha256 is not null)) then raise exception 'FAIL scrub';end if;
 if (select count(*) from app_private.camera_evidence_audit where evidence_id=e and action='deleted')<>1 then raise exception 'FAIL audit';end if;
 -- Owner-request path.
 perform set_config('request.jwt.claim.sub',u::text,true);set local role authenticated;r:=public.prepare_camera_evidence(null);e:=(r->>'id')::uuid;perform public.request_my_camera_evidence_deletion(e);
 if (select state from public.camera_evidence where id=e)<>'delete_queued' then raise exception 'FAIL owner delete';end if;
 perform set_config('request.jwt.claim.sub','',true);set local role anon;
 begin perform public.prepare_camera_evidence(null);raise exception 'FAIL anon prepare';exception when insufficient_privilege then null;end;
 begin perform (select count(*) from public.camera_evidence);raise exception 'FAIL anon read';exception when insufficient_privilege then null;end;
 reset role;
end $$;
select 'PASS evidence prepare/finalize, private access, 10d, 30d state, 7d grace, retry, scrub, audit, owner deletion, anon denial. Storage removal worker tested separately.' test_result;
