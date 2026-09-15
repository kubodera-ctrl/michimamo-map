-- Publish the safe Aizuwakamatsu City official open-data AED batch.
begin;

lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 39027 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_fukushima on commit drop as
select *
from public.safety_spots_nationwide_stage
where review_decision is null
  and source_url='https://data.data4citizen.jp/dataset/10060228'
  and prefecture='福島県'
  and municipality='会津若松市';

do $guard$
begin
  if (select count(*) from aed_step4_fukushima) <> 68 then
    raise exception 'Fukushima staging batch changed';
  end if;
  if exists (
    select 1 from aed_step4_fukushima
    where name is null or name='' or address is null or address=''
       or latitude not between 20 and 46 or longitude not between 122 and 154
       or active or duplicate_candidate
       or source_license <> 'CC BY'
       or geocode_source <> '自治体公式データの座標（表記整形・重複除外）'
  ) then
    raise exception 'Fukushima batch failed identity, coordinate, duplicate, license, or provenance checks';
  end if;
  if exists (
    select 1
    from aed_step4_fukushima b
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
    review_reason='会津若松市公式オープンデータ、CC BY、自治体公式座標、公開DB重複なしを確認',
    review_next_action='公開DBへ反映。更新終了データのため後継データ公開状況を継続監視',
    reviewed_at=now()
from aed_step4_fukushima b
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
  from aed_step4_fukushima
  on conflict (source_key) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 68 then raise exception 'Unexpected inserted count: %', inserted_count; end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 39095 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;

commit;
