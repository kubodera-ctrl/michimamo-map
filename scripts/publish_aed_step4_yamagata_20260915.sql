-- Publish the safe Yamagata prefecture-wide official AED batch.
begin;
lock table public.safety_spots in share row exclusive mode;
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 37404 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_yamagata on commit drop as
select * from public.safety_spots_nationwide_stage
where review_decision is null
  and source_url='https://www.pref.yamagata.jp/020051/kensei/shoukai/toukeijouhou/tokeijoho-opendate/opendata/cata2.html'
  and prefecture='山形県';

do $guard$
begin
  if (select count(*) from aed_step4_yamagata) <> 1563 then raise exception 'Yamagata staging batch changed'; end if;
  if (select count(distinct municipality) from aed_step4_yamagata) <> 30 then raise exception 'Yamagata municipality count changed'; end if;
  if exists (
    select 1 from aed_step4_yamagata
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or active or duplicate_candidate
       or source_license <> 'CC BY 4.0'
       or geocode_source <> '自治体公式データの座標（表記整形・重複除外）'
  ) then raise exception 'Yamagata batch failed identity, coordinate, duplicate, or provenance checks'; end if;
  if exists (
    select 1 from public.safety_spots p
    join (select distinct municipality from aed_step4_yamagata) b using (municipality)
    where p.facility_type='aed' and p.active and not p.duplicate_candidate
      and p.prefecture='山形県'
  ) then raise exception 'A target municipality already has public rows'; end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='山形県公式オープンデータ、CC BY 4.0、公式座標、公開DB重複なしを確認',
    review_next_action='公開DBへ反映', reviewed_at=now()
from aed_step4_yamagata b where s.source_key=b.source_key;

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
  from aed_step4_yamagata on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 1563 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 38967 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;
commit;
