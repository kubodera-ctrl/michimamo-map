-- Publish the first safe Akita address-geocoded AED batch.
begin;
lock table public.safety_spots in share row exclusive mode;
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 37327 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_akita on commit drop as
select * from public.safety_spots_nationwide_stage
where review_decision is null
  and source_url='https://www.city.yurihonjo.lg.jp/cgi-opd/opendata_detail.cgi?id=5eb5af499d1d79276538a1ebc8a07fd762c19383'
  and prefecture='秋田県' and municipality='由利本荘市';

do $guard$
begin
  if (select count(*) from aed_step4_akita) <> 77 then raise exception 'Akita staging batch changed'; end if;
  if exists (
    select 1 from aed_step4_akita
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or duplicate_candidate or geocode_source <> 'Geolonia住所正規化（位置情報レベル8）'
  ) then raise exception 'Akita batch failed identity, coordinate, duplicate, or precision checks'; end if;
  if exists (
    select 1 from public.safety_spots
    where facility_type='aed' and active and not duplicate_candidate
      and prefecture='秋田県' and municipality='由利本荘市'
  ) then raise exception 'Target municipality already has public rows'; end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='由利本荘市公式オープンデータ、CC BY、住所レベル8、公開DB重複なしを確認',
    review_next_action='公開DBへ反映', reviewed_at=now()
from aed_step4_akita b where s.source_key=b.source_key;

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
  from aed_step4_akita on conflict (source_key) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count <> 77 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 37404 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;
commit;
