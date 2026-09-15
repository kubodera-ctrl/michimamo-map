-- Publish the safe Shimotsuke City official open-data AED batch.
begin;

lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 38967 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_tochigi on commit drop as
select *
from public.safety_spots_nationwide_stage
where review_decision is null
  and source_url='https://www.city.shimotsuke.lg.jp/0017/info-0000006947-3.html'
  and prefecture='栃木県'
  and municipality='下野市';

do $guard$
begin
  if (select count(*) from aed_step4_tochigi) <> 60 then
    raise exception 'Tochigi staging batch changed';
  end if;
  if exists (
    select 1 from aed_step4_tochigi
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or active or duplicate_candidate
       or source_license <> 'CC BY 4.0'
       or geocode_source <> 'Geolonia住所正規化（位置情報レベル8）'
  ) then
    raise exception 'Tochigi batch failed identity, coordinate, duplicate, license, or precision checks';
  end if;
  if exists (
    select 1
    from aed_step4_tochigi b
    join public.safety_spots p
      on p.facility_type='aed' and p.active and not p.duplicate_candidate
     and p.prefecture=b.prefecture
     and regexp_replace(p.name,'[[:space:]　・･()（）-]','','g')=regexp_replace(b.name,'[[:space:]　・･()（）-]','','g')
     and regexp_replace(p.address,'[[:space:]　-]','','g')=regexp_replace(b.address,'[[:space:]　-]','','g')
  ) then
    raise exception 'Existing public name/address duplicate found';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='下野市公式オープンデータ、CC BY 4.0、住所レベル8の座標、公開DB重複なしを確認',
    review_next_action='公開DBへ反映',
    reviewed_at=now()
from aed_step4_tochigi b
where s.source_key=b.source_key;

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
  from aed_step4_tochigi
  on conflict (source_key) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 60 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 39027 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;

commit;
