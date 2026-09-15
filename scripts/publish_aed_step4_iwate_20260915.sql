-- Publish the first Iwate joint-catalog AED batch.
begin;
lock table public.safety_spots in share row exclusive mode;
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36536 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_iwate on commit drop as
select * from public.safety_spots_nationwide_stage
where review_decision is null
  and split_part(source_key,':',2) in
    ('d44ee68e2a9eb3e9','b8e364838604b6fe','9ebb5fb9e507e95a','be2a69aee4381cf2','9cbc1d1a30f14d6a');

do $guard$
begin
  if (select count(*) from aed_step4_iwate) <> 460 then raise exception 'Iwate staging batch changed'; end if;
  if exists (
    select 1 from aed_step4_iwate
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or duplicate_candidate or geocode_source <> '自治体公式データの座標（表記整形・重複除外）'
  ) then raise exception 'Iwate batch failed identity, coordinate, duplicate, or provenance checks'; end if;
  if exists (
    select 1 from public.safety_spots
    where facility_type='aed' and active and not duplicate_candidate and prefecture='岩手県'
      and municipality in ('盛岡市','宮古市','奥州市','二戸市','一戸町','滝沢市')
  ) then raise exception 'Target municipality already has public rows'; end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='岩手県共同公式カタログ、CC BY、公式座標、公開DB重複なしを確認',
    review_next_action='公開DBへ反映', reviewed_at=now()
from aed_step4_iwate b where s.source_key=b.source_key;

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
  from aed_step4_iwate on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 460 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 36996 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;
commit;
