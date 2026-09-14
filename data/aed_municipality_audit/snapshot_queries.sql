-- Read-only published AED snapshot. Keep the predicate aligned with publication reporting.
select prefecture, municipality, count(*)::int as n
from public.safety_spots
where facility_type = 'aed' and active and not duplicate_candidate
group by 1, 2 order by 1, 2;

-- For each unmatched (prefecture, municipality), bind the two values and retrieve:
-- select id, source_key, prefecture, municipality, address, name, source_name, source_url
-- from public.safety_spots
-- where facility_type = 'aed' and active and not duplicate_candidate
--   and prefecture = :prefecture and municipality = :municipality;
