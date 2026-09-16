begin;

insert into public.aed_sources(
  source_key, source_name, source_url, provider_name, license_name, license_url,
  commercial_use_allowed, modification_allowed, redistribution_allowed,
  attribution_required, attribution_text, terms_checked_at, notes
)
select
  'legacy:' || md5(s.source_url), min(s.source_name), s.source_url, min(s.source_name),
  min(s.source_license),
  case when min(s.source_license) ilike '%CC BY 4.0%' then 'https://creativecommons.org/licenses/by/4.0/'
       when min(s.source_license) ilike '%CC BY 2.1%' then 'https://creativecommons.org/licenses/by/2.1/jp/'
       else null end,
  case when min(s.source_license) ilike '%CC BY%' then true else null end,
  case when min(s.source_license) ilike '%CC BY%' then true else null end,
  case when min(s.source_license) ilike '%CC BY%' then true else null end,
  true, min(s.source_name) || ' / ' || min(s.source_license), now(),
  '既存公開AEDから移行。CC BY以外の利用条件は次回差分取得前に再確認する。'
from public.safety_spots s
where s.facility_type = 'aed' and s.source_url is not null and trim(s.source_url) <> ''
group by s.source_url
on conflict(source_key) do update set
  source_name = excluded.source_name, license_name = excluded.license_name,
  attribution_text = excluded.attribution_text, updated_at = now();

commit;
