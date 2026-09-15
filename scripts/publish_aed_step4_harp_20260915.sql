-- Publish the first resumable HARP/Hokkaido catalog batch.
begin;
lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36333 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_harp on commit drop as
select * from public.safety_spots_nationwide_stage
where review_decision is null
  and source_url like 'https://www.harp.lg.jp/opendata/dataset/%'
  and prefecture='北海道'
  and municipality in ('剣淵町','古平町','幌延町','新冠町','新得町','根室市','留萌市');

do $guard$
begin
  if (select count(*) from aed_step4_harp) <> 185 then
    raise exception 'HARP staging batch changed';
  end if;
  if exists (
    select 1 from aed_step4_harp
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or duplicate_candidate
       or geocode_source not in ('自治体公式データの座標（表記整形・重複除外）','Geolonia住所正規化（位置情報レベル8）')
  ) then
    raise exception 'HARP batch failed identity, coordinate, duplicate, or precision checks';
  end if;
  if exists (
    select 1 from public.safety_spots
    where facility_type='aed' and active and not duplicate_candidate
      and prefecture='北海道'
      and municipality in ('剣淵町','古平町','幌延町','新冠町','新得町','根室市','留萌市')
  ) then
    raise exception 'Target municipality already has public rows';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='HARP公式カタログ、CC BY、公式座標または住所レベル8、公開DB重複なしを確認',
    review_next_action='公開DBへ反映', reviewed_at=now()
from aed_step4_harp b where s.source_key=b.source_key;

do $publish$
declare inserted_count integer;
begin
  insert into public.safety_spots (
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,active,duplicate_candidate
  )
  select source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,'verified',true,false
  from aed_step4_harp on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 185 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36518 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;
commit;
