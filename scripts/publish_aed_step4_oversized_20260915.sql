-- Publish only new facilities recovered from four official BODIK source files
-- whose API organizations exceed the hard 1,000-row response limit.
begin;

lock table public.safety_spots in share row exclusive mode;

do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 35432 then
    raise exception 'Production baseline changed; reconcile again before publication';
  end if;
end;
$guard$;

create temporary table aed_step4_decisions on commit drop as
select source_key, 'published'::text as decision
from public.safety_spots_nationwide_stage
where source_url in (
  'https://odm.bodik.jp/dataset/a1b2e434-e4df-4f73-ac97-6e833d80952d',
  'https://odm.bodik.jp/dataset/a00f769c-0b01-4248-8f4c-ab4358c7af61',
  'https://odm.bodik.jp/dataset/657e3c99-9c43-4480-a3f0-e1213644e641',
  'https://odm.bodik.jp/dataset/7162284d-1626-41d2-b377-979b994f9f59'
)
and review_decision is null;

do $guard$
begin
  if (select count(*) from aed_step4_decisions) <> 3002 then
    raise exception 'Step 4 staging batch changed';
  end if;
end;
$guard$;

update aed_step4_decisions d
set decision='duplicate'
from public.safety_spots_nationwide_stage s
where s.source_key=d.source_key
and exists (
  select 1 from public.safety_spots p
  where p.facility_type='aed' and p.active and not p.duplicate_candidate
  and regexp_replace(lower(p.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')=regexp_replace(lower(s.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')
  and regexp_replace(lower(p.address),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')=regexp_replace(lower(s.address),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')
);

do $guard$
begin
  if (select count(*) from aed_step4_decisions where decision='duplicate') <> 2050 then
    raise exception 'Exact duplicate count changed';
  end if;
end;
$guard$;

update aed_step4_decisions d
set decision='duplicate'
from public.safety_spots_nationwide_stage s
where s.source_key=d.source_key and d.decision='published'
and exists (
  select 1 from public.safety_spots p
  where p.facility_type='aed' and p.active and not p.duplicate_candidate
  and p.prefecture=s.prefecture
  and p.latitude between s.latitude-0.001 and s.latitude+0.001
  and p.longitude between s.longitude-0.0015 and s.longitude+0.0015
  and (
    regexp_replace(lower(p.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')=regexp_replace(lower(s.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')
    or (
      least(length(regexp_replace(lower(p.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')),length(regexp_replace(lower(s.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')))>=3
      and (
        regexp_replace(lower(p.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g') like '%'||regexp_replace(lower(s.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')||'%'
        or regexp_replace(lower(s.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g') like '%'||regexp_replace(lower(p.name),'[^0-9a-zぁ-んァ-ヶ一-龠]','','g')||'%'
      )
    )
  )
  and 6371000*2*asin(sqrt(
    power(sin(radians(p.latitude-s.latitude)/2),2)
    +cos(radians(s.latitude))*cos(radians(p.latitude))*power(sin(radians(p.longitude-s.longitude)/2),2)
  ))<=50
);

do $guard$
begin
  if (select count(*) from aed_step4_decisions where decision='duplicate') <> 2952
     or (select count(*) from aed_step4_decisions where decision='published') <> 50 then
    raise exception 'Final Step 4 decision counts changed';
  end if;
end;
$guard$;

update public.safety_spots_nationwide_stage s
set review_decision=d.decision,
    review_reason=case when d.decision='duplicate'
      then '公開DBと施設名・住所が一致、または50m以内で施設名が一致・包含'
      else '公式原本CSV、座標、所在地、利用条件、公開DB重複なしを確認' end,
    review_next_action=case when d.decision='duplicate'
      then '既存公開レコードを維持し、この候補は非公開'
      else '公開DBへ反映' end,
    reviewed_at=now()
from aed_step4_decisions d
where s.source_key=d.source_key;

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
    s.installation_location,s.availability,s.geocode_source,s.quality_status,true,false
  from public.safety_spots_nationwide_stage s
  join aed_step4_decisions d using (source_key)
  where d.decision='published'
  on conflict (source_key) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 50 then
    raise exception 'Unexpected inserted count: %', inserted_count;
  end if;

  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> 35482 then
    raise exception 'Unexpected final public AED count';
  end if;
end;
$publish$;

commit;
