-- DRAFT / NON-PROD DESIGN REVIEW ONLY. DO NOT APPLY TO LIVE SUPABASE.
-- Additive storage in the EXISTING MAP public schema; no new project/schema.
-- Confirmed admin_validate(text) returns void and is_current_user_admin() boolean.
-- Existing sources: public.admin_users, public.admin_audit_log; no spots/point transactions modifications.

create table if not exists public.police_official_records (
    id text primary key,
    source_id text not null check (source_id in ('tokyo_mail_keishicho_opendata','tokyo_precursor_cumulative')),
    source_record_id text,
    source_url text not null,
    source_name text not null,
    license_name text,
    rights_status text not null default 'unverified' check (rights_status in ('unverified','verified','blocked')),
    title text not null,
    summary text not null,
    area_label text not null,
    event_type text not null,
    published_at text,
    occurred_at text,
    recognized_at text,
    location_precision text not null default 'unknown' check (location_precision in ('exact','town','municipality','unknown')),
    location_source text,
    latitude double precision,
    longitude double precision,
    source_status text not null check (source_status in ('active','corrected','withdrawn')),
    review_status text not null default 'pending' check (review_status in ('pending','pending_identity','pending_correction','approved','rejected')),
    identity_verified boolean not null default false,
    is_fixture boolean not null default false,
    source_revision integer not null check (source_revision >= 1),
    content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
    history jsonb not null default '[]'::jsonb,
    imported_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by uuid,
    constraint police_open_geo_check check (
      (latitude is null and longitude is null)
      or (source_id='tokyo_mail_keishicho_opendata' and location_precision='exact'
       and location_source='police_explicit_coordinates'
       and latitude between -90 and 90 and longitude between -180 and 180)
    ),
    constraint police_record_rights_check check (
      review_status <> 'approved' or (rights_status='verified' and identity_verified=true and is_fixture=false
        and source_status in ('active','corrected'))
    ),
    constraint police_record_source_check check (
      (source_id='tokyo_mail_keishicho_opendata' and source_url='https://mail.keishicho.metro.tokyo.lg.jp/opendata/')
      or (source_id='tokyo_precursor_cumulative' and source_url='https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html')
    )
);
create index if not exists police_official_review_lookup on public.police_official_records (review_status, source_status, imported_at desc);
alter table public.police_official_records enable row level security;
revoke all on public.police_official_records from public, anon, authenticated;
grant select on public.police_official_records to anon, authenticated;
create policy police_official_public_approved_only on public.police_official_records for select to anon, authenticated
 using (review_status='approved' and rights_status='verified' and identity_verified and not is_fixture
        and source_status in ('active','corrected'));

create table if not exists public.police_official_cumulative (
    id text primary key,
    dataset text not null check(dataset in ('town_stats','precursor')),
    year integer not null check(year between 2000 and 2100),
    through_month integer not null check(through_month between 1 and 12),
    revision integer not null check(revision > 0),
    source_url text not null,
    rights_status text not null default 'unverified' check (rights_status in ('unverified','verified','blocked')),
    review_status text not null default 'pending' check (review_status in ('pending','pending_correction','approved','rejected')),
    source_file_sha256 text not null check (source_file_sha256 ~ '^[0-9a-f]{64}$'),
    payload jsonb not null,
    requires_review boolean not null default false,
    is_fixture boolean not null default false,
    created_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewed_by uuid,
    unique (dataset,year,through_month,revision),
    constraint police_cumulative_review_gate check (
      review_status<>'approved' or (rights_status='verified' and not is_fixture and not requires_review)
    ),
    constraint police_cumulative_source_url check (
      (dataset='precursor' and source_url='https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html')
      or (dataset='town_stats' and source_url='https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html')
    )
);
alter table public.police_official_cumulative enable row level security;
revoke all on public.police_official_cumulative from public, anon, authenticated;
-- No public table grants until release payload contract and permissions have been reviewed.

-- Existing MAP admin boundary (JWT-linked admin AND existing password) is reused.
-- Function result is status counts only, never raw unreviewed records.
create or replace function public.admin_get_police_official_review(p_password text)
returns jsonb language plpgsql security definer set search_path='' as $func$
begin
    perform public.admin_validate(p_password);
    if auth.uid() is null or not public.is_current_user_admin() then
        raise exception 'admin_required' using errcode='42501';
    end if;
    return jsonb_build_object(
      'scope','police_official_review',
      'pending',(select count(*) from public.police_official_records where review_status like 'pending%'),
      'corrections',(select count(*) from public.police_official_records where source_status in ('corrected','withdrawn')),
      'rights_pending',(select count(*) from public.police_official_records where rights_status<>'verified'),
      'area_only',(select count(*) from public.police_official_records where latitude is null or longitude is null)
    );
end;
$func$;
revoke all on function public.admin_get_police_official_review(text) from public, anon, authenticated;
grant execute on function public.admin_get_police_official_review(text) to authenticated;

-- NOTE: Publication upsert, correction workflow and review transitions are deliberately
-- NOT activated by this SQL draft. Before release, create verified server-only ingestion,
-- authenticated audit-logged review RPC, cumulative public read contract, and exact role ACL tests.
-- Do not rely on client-side review_status filtering as the authorization boundary.
