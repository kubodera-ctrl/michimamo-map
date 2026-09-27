-- Additive subtype extension for user-submitted anomaly reports.
-- Does not change the official/public-agency `official` category.
alter table public.spots
  add column if not exists anomaly_type text;

alter table public.spots
  drop constraint if exists spots_anomaly_type_check;

alter table public.spots
  add constraint spots_anomaly_type_check
  check (
    (category = 'local_anomaly' and anomaly_type in (
      'illegal_dumping','abandoned_object_vehicle','suspicious_approach','road_damage',
      'fallen_tree','rockfall','flooding','street_fixture','wildlife','theft_warning',
      'snow_ice_disaster','police_safety','other'
    ))
    or
    (category <> 'local_anomaly' and anomaly_type is null)
  ) not valid;

alter table public.spots validate constraint spots_anomaly_type_check;

comment on column public.spots.anomaly_type is
  '地域の異変投稿の分類。人物・車両の識別子や追跡情報は保存しない。';

create or replace function app_private.submit_spot_once(p_request_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  u uuid:=auth.uid();
  r app_private.spot_submission_receipts%rowtype;
  sid bigint;
  pts integer;
  lat double precision;
  lng double precision;
  olat double precision;
  olng double precision;
  cat text;
  atype text;
  img text;
begin
  if u is null or not public.is_user_active(u) then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'invalid_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(u::text,2202));

  select * into r
  from app_private.spot_submission_receipts
  where user_id=u and request_id=p_request_id;

  if found then
    if r.payload_hash<>md5(p_payload::text) then
      raise exception 'request_payload_mismatch';
    end if;
    return jsonb_build_object('id',r.spot_id,'awarded',r.awarded,'replayed',true);
  end if;

  lat:=(p_payload->>'lat')::double precision;
  lng:=(p_payload->>'lng')::double precision;
  cat:=p_payload->>'category';
  atype:=nullif(trim(coalesce(p_payload->>'anomaly_type','')),'');
  img:=nullif(p_payload->>'image_url','');

  if lat is null or lng is null
    or not(lat between -90 and 90) or not(lng between -180 and 180)
    or cat is null or cat not in ('illegal','danger','patrol','abandoned','reckless','local_anomaly')
    or (cat='local_anomaly' and (
      atype is null or atype not in (
        'illegal_dumping','abandoned_object_vehicle','suspicious_approach','road_damage',
        'fallen_tree','rockfall','flooding','street_fixture','wildlife','theft_warning',
        'snow_ice_disaster','police_safety','other'
      )
    ))
    or (cat<>'local_anomaly' and atype is not null)
    or length(trim(coalesce(p_payload->>'title',''))) not between 1 and 200
    or length(coalesce(p_payload->>'comment',''))>2000
  then
    raise exception 'invalid_post';
  end if;

  if p_payload->>'source'='camera' then
    olat:=(p_payload->>'origin_lat')::double precision;
    olng:=(p_payload->>'origin_lng')::double precision;
    if olat is null or olng is null
      or not(olat between -90 and 90) or not(olng between -180 and 180)
      or cat in ('abandoned','local_anomaly') or img is not null
    then
      raise exception 'invalid_camera_post';
    end if;
    if 6371000*2*asin(sqrt(least(1.0,
      power(sin(radians(lat-olat)/2),2)
      +cos(radians(lat))*cos(radians(olat))*power(sin(radians(lng-olng)/2),2)
    )))>50 then
      raise exception 'camera_location_outside_50m';
    end if;
  elsif p_payload->>'source' is distinct from 'map' then
    raise exception 'invalid_source';
  end if;

  if img is not null and (
    cat not in ('abandoned','local_anomaly')
    or not exists(
      select 1 from storage.objects o
      where o.bucket_id='spot-images'
        and split_part(o.name,'/',1)=u::text
        and img='https://ckftozjhdszlwqnylmxv.supabase.co/storage/v1/object/public/spot-images/'||o.name
    )
  ) then
    raise exception 'owned_photo_required';
  end if;

  if cat='abandoned' and img is null then
    raise exception 'photo_required';
  end if;

  insert into public.spots(
    lat,lng,category,anomaly_type,title,comment,image_url,address,created_by
  )
  values(
    lat,lng,cat,atype,p_payload->>'title',p_payload->>'comment',
    img,left(coalesce(p_payload->>'address','不明なエリア'),200),u
  )
  returning id into sid;

  select coalesce(sum(amount),0) into pts
  from public.point_transactions
  where user_id=u and reason='spot_post' and ref_key=sid::text;

  insert into app_private.spot_submission_receipts(
    user_id,request_id,payload_hash,spot_id,awarded
  )
  values(u,p_request_id,md5(p_payload::text),sid,pts);

  return jsonb_build_object('id',sid,'awarded',pts,'replayed',false);
end
$function$;
