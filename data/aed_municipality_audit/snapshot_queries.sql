-- Read-only published AED snapshot. Keep the predicate aligned with publication reporting.
-- Save the result as published_groups_YYYYMMDD.json; do not overwrite older snapshots.
select prefecture, municipality, count(*)::int as n
from public.safety_spots
where facility_type = 'aed' and active and not duplicate_candidate
group by 1, 2 order by 1, 2;

-- For each unmatched (prefecture, municipality), bind the two values and retrieve:
-- select id, source_key, prefecture, municipality, address, name, source_name, source_url
-- from public.safety_spots
-- where facility_type = 'aed' and active and not duplicate_candidate
--   and prefecture = :prefecture and municipality = :municipality;

-- Step 2 decision snapshot. Save as step2_decision_groups.json.
select prefecture, municipality, review_decision, count(*)::int as n
from public.safety_spots_nationwide_stage
group by 1, 2, 3 order by 1, 2, 3;

-- Step 3 source inventory for currently published data.
select prefecture, municipality, min(source_url) as source_url,
       count(distinct source_url)::int as source_url_count,
       array_agg(distinct source_license order by source_license) as licenses,
       max(coalesce(source_updated_at, source_date::timestamptz, imported_at)) as latest_source_date
from public.safety_spots
where facility_type = 'aed' and active and not duplicate_candidate
group by 1, 2 order by 1, 2;
