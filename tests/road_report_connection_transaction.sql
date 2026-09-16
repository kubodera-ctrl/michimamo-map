-- Run inside BEGIN/ROLLBACK. Never changes/bypasses the real admin password check.
do $$
declare a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); road uuid; event uuid; version text; result jsonb; payload jsonb;
 id1 bigint;id2 bigint;id3 bigint;before_points bigint;after_points bigint;
begin
 insert into auth.users(id,aud,role) values(a,'authenticated','authenticated'),(u,'authenticated','authenticated');
 insert into public.profiles(auth_id,name,point) select u,'road fixture',0 where not exists(select 1 from public.profiles where auth_id=u);
 insert into public.admin_users(user_id,role,is_active) values(a,'admin',true);
 select coalesce(max(id),0)+10001 into id1 from public.spots;id2:=id1+1;id3:=id1+2;
 insert into public.spots(id,lat,lng,category,title,comment,created_by,created_at)
 values(id1,35,139,'illegal','road fixture','synthetic',u,now()-interval '1 hour'),
 (id2,35,139,'danger','road fixture 2','synthetic',u,now()-interval '1 hour'),
 (id3,35,139,'illegal','expired fixture','synthetic',u,now()-interval '11 days');
 select count(*) into before_points from public.point_transactions;
 perform set_config('request.jwt.claim.sub',u::text,true);
 set local role authenticated;
 begin perform public.admin_road_reports('incorrect','list','{}');raise exception 'FAIL nonadmin accepted';exception when insufficient_privilege then null;end;
 begin perform app_private.road_report_operation('list','{}');raise exception 'FAIL internal callable';exception when insufficient_privilege then null;end;
 begin perform (select count(*) from app_private.road_report_reviews);raise exception 'FAIL table readable';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin perform public.admin_road_reports('incorrect','list','{}');raise exception 'FAIL bad password accepted';exception when invalid_authorization_specification then null;end;
 reset role;
 -- Exercise the post-authorization operation using DB-admin fixture access only.
 result:=app_private.road_report_operation('create_road',jsonb_build_object('code',a::text,'label','検証用道路','boundaries','テスト始点からテスト終点','verified',true));
 road:=(result->>'road_id')::uuid;
 select app_private.road_source_version(s) into version from public.spots s where s.id=id1;
 payload:=jsonb_build_object('spot_id',id1,'source_version',version,'decision','accepted','road_id',road,'observed_at',now()-interval '2 hours',
 'checks',jsonb_build_object('road',true,'dedup',true,'time',true,'obstruction',true));
 begin perform app_private.road_report_operation('review',payload-'checks');raise exception 'FAIL missing checks';exception when raise_exception then if sqlerrm<>'review_checks_required' then raise;end if;end;
 perform app_private.road_report_operation('review',payload);
 select event_id into event from app_private.road_report_reviews where spot_id=id1;
 select app_private.road_source_version(s) into version from public.spots s where s.id=id2;
 payload:=payload||jsonb_build_object('spot_id',id2,'source_version',version,'event_id',event);
 perform app_private.road_report_operation('review',payload);
 result:=app_private.road_report_operation('list','{}');
 if (select count(*) from jsonb_array_elements(result->'records')r where r->>'eventId'=event::text)<>2 then raise exception 'FAIL duplicate event link';end if;
 if (select count(distinct r->>'eventId') from jsonb_array_elements(result->'records')r where r->>'roadId'=road::text)<>1 then raise exception 'FAIL group';end if;
 if result::text like '%vehicleKey%' or result::text like '%image_url%' then raise exception 'FAIL sensitive field';end if;
 begin perform app_private.road_report_operation('review',payload||jsonb_build_object('source_version','stale'));raise exception 'FAIL stale';exception when raise_exception then if sqlerrm<>'source_changed' then raise;end if;end;
 begin perform app_private.road_report_operation('review',payload||jsonb_build_object('spot_id',id3));raise exception 'FAIL expired';exception when raise_exception then if sqlerrm<>'source_unavailable' then raise;end if;end;
 begin perform app_private.road_report_operation('review',payload||jsonb_build_object('road_id',gen_random_uuid()));raise exception 'FAIL invalid road';exception when raise_exception then if sqlerrm<>'road_required' then raise;end if;end;
 update public.spots set confirm_count=confirm_count+1 where id=id1;
 if not exists(select 1 from app_private.road_report_reviews where spot_id=id1)then raise exception 'FAIL vote invalidates review';end if;
 update public.spots set title='edited fixture' where id=id1;
 if exists(select 1 from app_private.road_report_reviews where spot_id=id1)then raise exception 'FAIL edit invalidation';end if;
 update public.spots set is_hidden=true where id=id2;
 if exists(select 1 from app_private.road_report_reviews where spot_id=id2)then raise exception 'FAIL hide invalidation';end if;
 update public.spots set is_hidden=false where id=id2;
 select app_private.road_source_version(s) into version from public.spots s where s.id=id2;
 payload:=payload||jsonb_build_object('source_version',version,'event_id',null);
 perform app_private.road_report_operation('review',payload);
 update app_private.road_report_reviews set expires_at=now()-interval '1 second' where spot_id=id2;
 result:=app_private.road_report_operation('list','{}');
 if exists(select 1 from app_private.road_report_reviews where spot_id=id2)then raise exception 'FAIL expiry cleanup';end if;
 perform app_private.road_report_operation('review',payload);
 delete from public.spots where id=id2;
 if exists(select 1 from app_private.road_report_reviews where spot_id=id2)then raise exception 'FAIL delete cascade';end if;
 select count(*) into after_points from public.point_transactions;
 if after_points<>before_points then raise exception 'FAIL points changed';end if;
 perform set_config('request.jwt.claim.sub','',true);
 set local role anon;
 begin perform public.admin_road_reports('incorrect','list','{}');raise exception 'FAIL anon';exception when insufficient_privilege then null;end;
 reset role;
end $$;
select 'PASS road DB logic, auth denials, grouping, checks, stale/expiry, hide/edit/delete, points unchanged. Admin-password success E2E not exercised.' as test_result;
