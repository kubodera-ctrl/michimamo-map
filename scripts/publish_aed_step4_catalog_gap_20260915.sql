-- Publish the coordinate-complete records from seven official municipal CSVs
-- found in the BODIK catalog but absent from the normalized BODIK AED API.
begin;

lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 35471 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_catalog_gap on commit drop as
select *
from public.safety_spots_nationwide_stage
where review_decision is null
  and source_url in (
    'https://odm.bodik.jp/dataset/d86dab94-f354-40c6-abf6-fb2d29f43780',
    'https://odm.bodik.jp/dataset/8260ae19-e941-44e2-b68b-f037b4b43e8e',
    'https://odm.bodik.jp/dataset/ca1772cb-d96c-4494-bc84-c2a66aa77803',
    'https://odm.bodik.jp/dataset/71fd2b52-dd1c-4642-9c8d-f048228b1eae',
    'https://odm.bodik.jp/dataset/77e30aa3-8f88-4267-bf10-b290167948d7'
  );

do $guard$
begin
  if (select count(*) from aed_step4_catalog_gap) <> 623 then
    raise exception 'Catalog gap staging batch changed';
  end if;
  if exists (
    select 1 from aed_step4_catalog_gap
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or duplicate_candidate
  ) then
    raise exception 'Catalog gap batch failed identity, coordinate, or duplicate checks';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='自治体公式CSV、CC BY系ライセンス、施設名、所在地、座標、公開DB重複なしを確認',
    review_next_action='公開DBへ反映',
    reviewed_at=now()
from aed_step4_catalog_gap b
where s.source_key=b.source_key;

do $publish$
declare inserted_count integer;
begin
  insert into public.safety_spots (
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,active,duplicate_candidate
  )
  select
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,'verified',true,false
  from aed_step4_catalog_gap
  on conflict (source_key) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 623 then
    raise exception 'Unexpected inserted count: %', inserted_count;
  end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36094 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;

commit;
