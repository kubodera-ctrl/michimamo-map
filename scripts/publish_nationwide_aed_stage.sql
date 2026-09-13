-- 審査済みステージングを本番へUPSERTする。重複候補は保存するが公開しない。
insert into public.safety_spots (
  source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,
  latitude,longitude,source_name,source_url,source_date,source_license,geocode_source,geocoded_title,
  active,source_external_id,prefecture_code,installation_location,availability,source_updated_at,
  imported_at,duplicate_candidate,duplicate_group_key,quality_status
)
select
  source_key,facility_type,name,prefecture,municipality,address,phone,parent_name,
  latitude,longitude,source_name,source_url,source_date,source_license,geocode_source,geocoded_title,
  not duplicate_candidate,source_external_id,prefecture_code,installation_location,availability,source_updated_at,
  imported_at,duplicate_candidate,duplicate_group_key,quality_status
from public.safety_spots_nationwide_stage
on conflict (source_key) do update set
  facility_type=excluded.facility_type,name=excluded.name,prefecture=excluded.prefecture,
  municipality=excluded.municipality,address=excluded.address,phone=excluded.phone,
  parent_name=excluded.parent_name,latitude=excluded.latitude,longitude=excluded.longitude,
  source_name=excluded.source_name,source_url=excluded.source_url,source_date=excluded.source_date,
  source_license=excluded.source_license,geocode_source=excluded.geocode_source,
  geocoded_title=excluded.geocoded_title,active=excluded.active,
  source_external_id=excluded.source_external_id,prefecture_code=excluded.prefecture_code,
  installation_location=excluded.installation_location,availability=excluded.availability,
  source_updated_at=excluded.source_updated_at,imported_at=excluded.imported_at,
  duplicate_candidate=excluded.duplicate_candidate,duplicate_group_key=excluded.duplicate_group_key,
  quality_status=excluded.quality_status,updated_at=now();
