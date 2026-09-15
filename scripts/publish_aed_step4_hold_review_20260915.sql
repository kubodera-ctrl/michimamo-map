-- Resolve Step 4 AED holds against the current official source files.
--
-- Publish 11 records where the official CSV identifies distinct AED entries by
-- facility/address/installation location. Retire the four historical Otofuke
-- resources now superseded by the municipality's 2025-04 CSV. Keep the 15
-- Omihachiman representative-coordinate records on hold.
begin;

lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 35482 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 41 then
    raise exception 'Hold baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_publish_ids(id bigint primary key) on commit drop;
insert into aed_step4_publish_ids(id) values
  -- Kitahiroshima: three pairs with different official facility/address or installation locations.
  (14197),(14199),(14207),(14224),(14247),(14320),
  -- Eniwa: fire vehicle and second-floor office are separate installations.
  (13940),(14070),
  -- Sagae: one AED shared by two after-school-club labels at the same school room.
  (15186),
  -- Noshiro: first-floor support center office and entrance hall are separate installations.
  (14897),(14919);

do $guard$
begin
  if (select count(*) from aed_step4_publish_ids) <> 11
     or (select count(*) from public.safety_spots_nationwide_stage s join aed_step4_publish_ids p using(id) where s.review_decision='hold') <> 11 then
    raise exception 'Reviewed hold set changed';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision='published',
    review_reason='公式原本CSVで別行として掲載され、施設・住所または設置位置が異なることを確認',
    review_next_action='公開DBへ反映',
    reviewed_at=now()
from aed_step4_publish_ids p
where s.id=p.id;

-- The second Sagae label points to the exact same school room and coordinates.
update public.safety_spots_nationwide_stage
set review_decision='duplicate',
    review_reason='公式原本CSV上で学童保育ねっこクラブと同一住所・同一座標・同一設置位置のため同一AEDとして整理',
    review_next_action='学童保育ねっこクラブの公開レコードを維持',
    reviewed_at=now()
where id=15188 and review_decision='hold';

-- Only 016314_aed_202504.csv is the current Otofuke snapshot. The following
-- resources are dated 2023-02, 2022-10, 2022-05, or undated historical data.
create temporary table otofuke_legacy_resources(resource_id text primary key) on commit drop;
insert into otofuke_legacy_resources(resource_id) values
  ('bd5ce834-551e-4699-a14e-85536c354fe7'),
  ('19d50995-6b46-4105-9bda-71f481459d07'),
  ('d623c9c6-be20-44cb-8fbc-4f597d76b64b'),
  ('b64cbb22-594d-4812-b9c0-6691d64bb651');

do $guard$
begin
  if (
    select count(*) from public.safety_spots
    where facility_type='aed' and active
      and split_part(source_key,':',2) in (select resource_id from otofuke_legacy_resources)
  ) <> 22 then
    raise exception 'Active Otofuke legacy count changed';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage
set review_decision='duplicate',
    review_reason='音更町の過去版CSV。現行の016314_aed_202504.csvを正として旧版を非公開化',
    review_next_action='現行2025年4月版の公開レコードを維持',
    reviewed_at=now()
where municipality='音更町'
  and split_part(source_key,':',2) in (select resource_id from otofuke_legacy_resources);

update public.safety_spots
set active=false,
    updated_at=now()
where facility_type='aed' and active
  and split_part(source_key,':',2) in (select resource_id from otofuke_legacy_resources);

do $publish$
declare inserted_count integer;
begin
  insert into public.safety_spots (
    source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,
    latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,
    installation_location,availability,geocode_source,quality_status,active,duplicate_candidate
  )
  select
    s.source_key,s.facility_type,s.name,s.prefecture,s.prefecture_code,s.municipality,s.address,s.phone,
    s.latitude,s.longitude,s.source_name,s.source_url,s.source_license,s.source_date,s.source_updated_at,
    s.installation_location,s.availability,s.geocode_source,'verified',true,false
  from public.safety_spots_nationwide_stage s
  join aed_step4_publish_ids p using(id)
  on conflict (source_key) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 11 then
    raise exception 'Unexpected inserted count: %', inserted_count;
  end if;

  if (select count(*) from public.safety_spots_nationwide_stage where review_decision='hold') <> 15 then
    raise exception 'Unexpected remaining hold count';
  end if;
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 35471 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;

commit;
