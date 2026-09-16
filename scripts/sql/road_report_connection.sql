-- Production migration via Supabase MCP; no paid service or image upload.
create table app_private.road_sections (
 id uuid primary key default gen_random_uuid(), code text not null unique check(length(code) between 3 and 80),
 label text not null check(length(label) between 3 and 160), boundaries text not null check(length(boundaries) between 8 and 500),
 created_at timestamptz not null default now()
);
create table app_private.road_report_reviews (
 spot_id bigint primary key references public.spots(id) on delete cascade,
 road_id uuid references app_private.road_sections(id), event_id uuid,
 status text not null check(status in ('accepted','rejected')),
 observed_at timestamptz, obstruction_confirmed boolean not null default false,
 source_version text not null, expires_at timestamptz not null,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz not null default now(),
 check(status<>'accepted' or (road_id is not null and event_id is not null and observed_at is not null))
);
alter table app_private.road_sections enable row level security;
alter table app_private.road_report_reviews enable row level security;
revoke all on app_private.road_sections,app_private.road_report_reviews from public,anon,authenticated;
create policy road_sections_client_deny on app_private.road_sections for all to anon,authenticated using(false) with check(false);
create policy road_reviews_client_deny on app_private.road_report_reviews for all to anon,authenticated using(false) with check(false);
create index road_reviews_road_idx on app_private.road_report_reviews(road_id);
create index road_reviews_event_idx on app_private.road_report_reviews(event_id);
create index road_reviews_expiry_idx on app_private.road_report_reviews(expires_at);
create index road_reviews_reviewer_idx on app_private.road_report_reviews(reviewed_by);
create index spots_parking_created_idx on public.spots(created_at desc,id desc) where category in ('illegal','danger') and not is_hidden;

create function app_private.road_source_version(s public.spots) returns text language sql immutable security invoker set search_path='' as $$
 select md5(jsonb_build_array(s.created_at at time zone 'UTC',s.lat,s.lng,s.category,s.title,s.comment,s.image_url,md5(coalesce(s.image_data,'')),s.created_by,s.is_hidden)::text)
$$;
revoke all on function app_private.road_source_version(public.spots) from public,anon,authenticated;

create function app_private.invalidate_road_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if app_private.road_source_version(new) is distinct from app_private.road_source_version(old) then
   delete from app_private.road_report_reviews where spot_id=new.id;
 end if;
 return new;
end $$;
revoke all on function app_private.invalidate_road_review() from public,anon,authenticated;
create trigger road_review_source_changed after update of created_at,lat,lng,category,title,comment,image_url,image_data,created_by,is_hidden on public.spots for each row execute function app_private.invalidate_road_review();

create function app_private.road_report_operation(p_action text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_source public.spots%rowtype; r app_private.road_sections%rowtype; v_event uuid; v_road uuid; v_observed timestamptz;
 v_version text; v_result jsonb; v_status text; v_now timestamptz:=now(); v_offset integer; v_checks jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='28000'; end if;
 if not public.is_current_user_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_action is null or p_action not in ('list','create_road','review') or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid_request'; end if;
 -- Lightweight review metadata only. Expired reviews never contribute, even before this cleanup.
 delete from app_private.road_report_reviews where expires_at<=v_now;
 if p_action='create_road' then
   if length(trim(coalesce(p_payload->>'code',''))) not between 3 and 80
     or length(trim(coalesce(p_payload->>'label',''))) not between 3 and 160
     or length(trim(coalesce(p_payload->>'boundaries',''))) not between 8 and 500
     or p_payload->>'verified' is distinct from 'true' then raise exception 'road_details_required'; end if;
   insert into app_private.road_sections(code,label,boundaries)
   values(trim(p_payload->>'code'),trim(p_payload->>'label'),trim(p_payload->>'boundaries')) returning * into r;
   insert into public.admin_audit_log(action,target_type,target_id,detail) values('road_section_create','road',r.id::text,'{}');
   return jsonb_build_object('road_id',r.id);
 elsif p_action='review' then
   perform pg_advisory_xact_lock(hashtextextended('road_reports_review',0));
   select * into v_source from public.spots where id=(p_payload->>'spot_id')::bigint for update;
   if not found or v_source.is_hidden or v_source.category not in ('illegal','danger') or v_source.created_at<v_now-interval '10 days' or v_source.created_at>v_now then raise exception 'source_unavailable'; end if;
   v_version:=app_private.road_source_version(v_source);
   if p_payload->>'source_version' is distinct from v_version then raise exception 'source_changed'; end if;
   v_status:=p_payload->>'decision';v_checks:=p_payload->'checks';
   if v_status is null or v_status not in ('accepted','rejected') then raise exception 'invalid_decision'; end if;
   if v_status='accepted' then
     if v_checks->>'road' is distinct from 'true' or v_checks->>'dedup' is distinct from 'true' or v_checks->>'time' is distinct from 'true' then raise exception 'review_checks_required'; end if;
     v_road:=(p_payload->>'road_id')::uuid;
     if not exists(select 1 from app_private.road_sections where id=v_road) then raise exception 'road_required'; end if;
     v_observed:=(p_payload->>'observed_at')::timestamptz;
     if v_observed is null or v_observed>least(v_now,v_source.created_at+interval '5 minutes') or v_observed<v_now-interval '10 days' then raise exception 'observation_time_required'; end if;
     v_event:=nullif(p_payload->>'event_id','')::uuid;
     if v_event is not null then
       if not exists(select 1 from app_private.road_report_reviews q join public.spots x on x.id=q.spot_id
         where q.event_id=v_event and q.road_id=v_road and q.status='accepted' and q.expires_at>v_now and not x.is_hidden
         and x.category in ('illegal','danger') and q.source_version=app_private.road_source_version(x)) then raise exception 'event_not_on_road'; end if;
     else v_event:=gen_random_uuid(); end if;
   end if;
   insert into app_private.road_report_reviews(spot_id,road_id,event_id,status,observed_at,obstruction_confirmed,source_version,expires_at,reviewed_by)
   values(v_source.id,v_road,v_event,v_status,v_observed,v_status='accepted' and coalesce(v_checks->>'obstruction'='true',false),v_version,
     least(v_source.created_at+interval '10 days',coalesce(v_observed+interval '10 days',v_source.created_at+interval '10 days')),auth.uid())
   on conflict(spot_id) do update set road_id=excluded.road_id,event_id=excluded.event_id,status=excluded.status,observed_at=excluded.observed_at,
     obstruction_confirmed=excluded.obstruction_confirmed,source_version=excluded.source_version,expires_at=excluded.expires_at,reviewed_by=excluded.reviewed_by,reviewed_at=v_now;
   insert into public.admin_audit_log(action,target_type,target_id,detail)
   values('road_report_review','spot',v_source.id::text,jsonb_build_object('decision',v_status));
   return jsonb_build_object('status',v_status);
 end if;
 v_offset:=coalesce((p_payload->>'offset')::integer,0);
 if v_offset<0 or v_offset>10000 then raise exception 'invalid_offset'; end if;
 if (select count(*) from app_private.road_report_reviews where status='accepted' and expires_at>v_now)>2000 then raise exception 'summary_capacity_reached'; end if;
 select jsonb_build_object(
 'fromMs',floor(extract(epoch from v_now-interval '10 days')*1000)::bigint,'toMs',floor(extract(epoch from v_now)*1000)::bigint,'nowMs',floor(extract(epoch from v_now)*1000)::bigint,
 'periodId','last-10-days-no-identity',
 'roads',coalesce((select jsonb_agg(to_jsonb(x) order by code) from app_private.road_sections x),'[]'::jsonb),
 'queueTotal',(select count(*) from public.spots where category in ('illegal','danger') and not is_hidden and created_at>=v_now-interval '10 days' and created_at<=v_now),
 'queue',coalesce((select jsonb_agg(to_jsonb(x) order by created_at desc,id desc) from (
   select s.id::text as id,s.title,s.comment,s.address,s.lat,s.lng,s.created_at,app_private.road_source_version(s) as source_version,
     coalesce(q.status,'pending') as review_status,q.road_id,q.event_id,q.observed_at,q.obstruction_confirmed
   from public.spots s left join app_private.road_report_reviews q on q.spot_id=s.id and q.expires_at>v_now
   where s.category in ('illegal','danger') and not s.is_hidden and s.created_at>=v_now-interval '10 days' and s.created_at<=v_now
   order by s.created_at desc,s.id desc limit 50 offset v_offset
 )x),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(jsonb_build_object('observationId',q.spot_id::text,'eventId',q.event_id::text,'roadId',q.road_id::text,
   'review','accepted','analyticsEligible',true,'dedupResolved',true,'eventKind','observation',
   'observedAtMs',floor(extract(epoch from q.observed_at)*1000)::bigint,'expiresAtMs',floor(extract(epoch from q.expires_at)*1000)::bigint,
   'obstructionReview',case when q.obstruction_confirmed then 'confirmed' else 'unconfirmed' end))
   from app_private.road_report_reviews q join public.spots s on s.id=q.spot_id
   where q.status='accepted' and q.expires_at>v_now and s.created_at>=v_now-interval '10 days' and s.created_at<=v_now and not s.is_hidden and s.category in ('illegal','danger')
     and q.source_version=app_private.road_source_version(s)), '[]'::jsonb)
 ) into v_result;
 return v_result;
end $$;
revoke all on function app_private.road_report_operation(text,jsonb) from public,anon,authenticated;
create function app_private.admin_road_reports(p_password text,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='28000'; end if;
 perform public.admin_validate(p_password);
 return app_private.road_report_operation(p_action,p_payload);
end $$;
revoke all on function app_private.admin_road_reports(text,text,jsonb) from public,anon,authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.admin_road_reports(text,text,jsonb) to authenticated;
create function public.admin_road_reports(p_password text,p_action text default 'list',p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.admin_road_reports(p_password,p_action,p_payload)
$$;
revoke all on function public.admin_road_reports(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_road_reports(text,text,jsonb) to authenticated;
