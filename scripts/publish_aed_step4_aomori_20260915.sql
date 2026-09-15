-- Publish the first Aomori official-catalog gap batch.
begin;
lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36518 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_aomori on commit drop as
select * from public.safety_spots_nationwide_stage
where review_decision is null
  and split_part(source_key,':',2)='e14c6795904d3d23'
  and source_url='https://opendata.pref.aomori.lg.jp/dataset/2009.html'
  and prefecture='青森県'
  and municipality='南部町';

do $guard$
begin
  if (select count(*) from aed_step4_aomori) <> 18 then
    raise exception 'Aomori staging batch changed';
  end if;
  if exists (
    select 1 from aed_step4_aomori
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or duplicate_candidate
       or geocode_source <> '自治体公式データの座標（表記整形・重複除外）'
  ) then
    raise exception 'Aomori batch failed identity, coordinate, duplicate, or provenance checks';
  end if;
  if exists (
    select 1 from public.safety_spots
    where facility_type='aed' and active and not duplicate_candidate
      and prefecture='青森県' and municipality='南部町'
  ) then
    raise exception 'Target municipality already has public rows';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='青森県公式カタログ、CC BY、公式座標、外部利用可、公開DB重複なしを確認',
    review_next_action='公開DBへ反映', reviewed_at=now()
from aed_step4_aomori b where s.source_key=b.source_key;

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
  from aed_step4_aomori on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 18 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36536 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;
commit;
