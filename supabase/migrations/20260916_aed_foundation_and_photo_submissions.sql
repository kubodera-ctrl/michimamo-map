begin;

-- 全国AED原本・ライセンス・差分投入の台帳。
create table if not exists public.aed_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  source_url text not null,
  provider_name text not null,
  license_name text not null,
  license_url text,
  commercial_use_allowed boolean,
  modification_allowed boolean,
  redistribution_allowed boolean,
  attribution_required boolean not null default true,
  attribution_text text,
  permission_evidence_url text,
  terms_checked_at timestamptz not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_key ~ '^[a-z0-9][a-z0-9:_-]{2,119}$')
);

create table if not exists public.aed_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.aed_sources(id),
  batch_key text not null unique,
  source_version text,
  original_object_path text not null,
  original_sha256 text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'staged' check (status in ('staged','validated','published','rolled_back','failed')),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  published_count integer not null default 0 check (published_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  hold_count integer not null default 0 check (hold_count >= 0),
  validation_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  published_at timestamptz,
  rolled_back_at timestamptz,
  created_by uuid references auth.users(id)
);

create table if not exists public.aed_source_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.aed_import_batches(id),
  source_external_id text not null,
  raw_row_number integer,
  raw_payload jsonb not null,
  raw_sha256 text not null check (raw_sha256 ~ '^[0-9a-f]{64}$'),
  normalized_payload jsonb,
  quality_rank text check (quality_rank in ('S','A','B','C','D')),
  decision text not null default 'pending' check (decision in ('pending','published','duplicate','hold','invalid','withdrawn')),
  decision_reason text,
  safety_spot_id bigint references public.safety_spots(id),
  created_at timestamptz not null default now(),
  unique (batch_id, source_external_id)
);

create table if not exists public.aed_field_provenance (
  safety_spot_id bigint not null references public.safety_spots(id) on delete cascade,
  field_name text not null,
  source_record_id uuid not null references public.aed_source_records(id),
  source_value jsonb,
  normalized_value jsonb,
  confidence text not null check (confidence in ('official','verified','estimated','reported')),
  recorded_at timestamptz not null default now(),
  primary key (safety_spot_id, field_name, source_record_id),
  check (field_name in ('name','address','latitude','longitude','installation_location','availability','phone','active'))
);

-- 消去せず、存在確認・変更・撤去候補を履歴化する。
create table if not exists public.aed_lifecycle_reports (
  id uuid primary key default gen_random_uuid(),
  safety_spot_id bigint not null references public.safety_spots(id),
  report_type text not null check (report_type in ('existence_confirmed','information_change','relocation','removal_candidate','closed_candidate')),
  reporter_user_id uuid references auth.users(id) on delete set null,
  description text not null check (length(trim(description)) between 1 and 1000),
  photo_object_path text,
  latitude double precision check (latitude between 20 and 50),
  longitude double precision check (longitude between 120 and 155),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','resolved')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.aed_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_kind text not null default 'new' check (submission_kind in ('new','existing_confirmation','information_update')),
  facility_name text not null check (length(trim(facility_name)) between 2 and 160),
  installation_location text not null check (length(trim(installation_location)) between 2 and 500),
  address text not null check (length(trim(address)) between 3 and 300),
  prefecture text not null check (length(trim(prefecture)) between 2 and 8),
  municipality text,
  latitude double precision not null check (latitude between 20 and 50),
  longitude double precision not null check (longitude between 120 and 155),
  gps_accuracy_m double precision not null check (gps_accuracy_m > 0 and gps_accuracy_m <= 1000),
  photo_object_path text not null,
  photo_sha256 text not null check (photo_sha256 ~ '^[0-9a-f]{64}$'),
  photo_width integer not null check (photo_width between 320 and 12000),
  photo_height integer not null check (photo_height between 320 and 12000),
  photo_captured_at timestamptz,
  nearby_candidate_ids bigint[] not null default '{}',
  matched_safety_spot_id bigint references public.safety_spots(id),
  duplicate_of_submission_id uuid references public.aed_submissions(id),
  fraud_flags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','needs_review','approved_new','approved_existing','rejected','needs_changes')),
  submitter_photo_license_accepted boolean not null check (submitter_photo_license_accepted),
  privacy_confirmed boolean not null check (privacy_confirmed),
  terms_version text not null,
  review_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aed_submissions_status_created_idx on public.aed_submissions(status, created_at);
create index if not exists aed_submissions_user_created_idx on public.aed_submissions(user_id, created_at desc);
create index if not exists aed_submissions_photo_hash_idx on public.aed_submissions(photo_sha256);
create index if not exists aed_submissions_coordinates_idx on public.aed_submissions(latitude, longitude);

create table if not exists public.aed_submission_rewards (
  submission_id uuid primary key references public.aed_submissions(id),
  user_id uuid not null references auth.users(id),
  safety_spot_id bigint not null unique references public.safety_spots(id),
  point_transaction_id bigint not null unique references public.point_transactions(id),
  points integer not null default 30 check (points = 30),
  awarded_at timestamptz not null default now()
);

alter table public.point_transactions drop constraint if exists point_transactions_reason_check;
alter table public.point_transactions add constraint point_transactions_reason_check
  check (reason in ('spot_post','spot_like','quiz','gacha_cost','gacha_prize','admin','aed_new_approval'));

create or replace function public.prepare_aed_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_duplicate uuid;
  v_same_location_count integer;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not public.is_user_active(auth.uid()) then
    raise exception 'account_suspended' using errcode = '42501';
  end if;

  select s.id into v_duplicate
  from public.aed_submissions s
  where s.photo_sha256 = new.photo_sha256
  order by s.created_at
  limit 1;
  if v_duplicate is not null then
    new.duplicate_of_submission_id := v_duplicate;
    new.fraud_flags := array_append(new.fraud_flags, 'duplicate_photo');
  end if;

  select count(*) into v_same_location_count
  from public.aed_submissions s
  where s.user_id = new.user_id
    and s.created_at >= now() - interval '24 hours'
    and abs(s.latitude - new.latitude) < 0.00005
    and abs(s.longitude - new.longitude) < 0.00005;
  if v_same_location_count >= 2 then
    new.fraud_flags := array_append(new.fraud_flags, 'coordinate_velocity');
  end if;
  if new.gps_accuracy_m > 100 then
    new.fraud_flags := array_append(new.fraud_flags, 'low_gps_accuracy');
  end if;
  if cardinality(new.fraud_flags) > 0 then
    new.status := 'needs_review';
  end if;
  return new;
end;
$$;

drop trigger if exists aed_submissions_prepare on public.aed_submissions;
create trigger aed_submissions_prepare
before insert on public.aed_submissions
for each row execute function public.prepare_aed_submission();

create or replace function public.get_nearby_aed_candidates(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_m integer default 500,
  p_limit integer default 10
)
returns table(id bigint, name text, address text, installation_location text, distance_m double precision)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with candidates as (
    select s.id, s.name, s.address, s.installation_location,
      6371000 * acos(least(1.0, greatest(-1.0,
        cos(radians(p_latitude)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(p_longitude))
        + sin(radians(p_latitude)) * sin(radians(s.latitude))
      ))) as distance_m
    from public.safety_spots s
    where s.facility_type = 'aed' and s.active and not s.duplicate_candidate
      and s.latitude between p_latitude - 0.02 and p_latitude + 0.02
      and s.longitude between p_longitude - 0.03 and p_longitude + 0.03
  )
  select c.id, c.name, c.address, c.installation_location, c.distance_m
  from candidates c
  where c.distance_m <= least(greatest(coalesce(p_radius_m, 500), 50), 2000)
  order by c.distance_m
  limit least(greatest(coalesce(p_limit, 10), 1), 20);
$$;

create or replace function public.admin_review_aed_submission(
  p_submission_id uuid,
  p_decision text,
  p_existing_safety_spot_id bigint default null,
  p_review_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission public.aed_submissions%rowtype;
  v_spot_id bigint;
  v_balance integer;
  v_transaction_id bigint;
begin
  if not public.is_current_user_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_decision not in ('approved_new','approved_existing','rejected','needs_changes') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select * into v_submission from public.aed_submissions
  where id = p_submission_id for update;
  if not found then raise exception 'submission_not_found' using errcode = 'P0002'; end if;
  if v_submission.status in ('approved_new','approved_existing','rejected') then
    raise exception 'submission_already_finalized' using errcode = '23505';
  end if;

  if p_decision = 'approved_new' then
    if p_existing_safety_spot_id is not null then
      raise exception 'existing_spot_not_allowed_for_new' using errcode = '22023';
    end if;
    insert into public.safety_spots (
      source_key, facility_type, name, prefecture, municipality, address,
      latitude, longitude, source_name, source_url, source_date, source_license,
      geocode_source, source_external_id, installation_location, source_updated_at,
      duplicate_candidate, quality_status
    ) values (
      'user-aed:' || v_submission.id::text, 'aed', v_submission.facility_name,
      v_submission.prefecture, nullif(trim(v_submission.municipality), ''), v_submission.address,
      v_submission.latitude, v_submission.longitude, 'まちまもMAP ユーザー現地投稿',
      '/aed-submissions/' || v_submission.id::text, current_date,
      '投稿写真利用許諾（無断転載禁止）', 'ユーザー投稿GPS（現地確認済み）',
      v_submission.id::text, v_submission.installation_location, now(), false, 'verified'
    ) returning id into v_spot_id;

    v_balance := public.apply_point_transaction(
      v_submission.user_id, 30, 'aed_new_approval', v_submission.id::text
    );
    select id into v_transaction_id from public.point_transactions
    where user_id = v_submission.user_id and reason = 'aed_new_approval' and ref_key = v_submission.id::text;
    insert into public.aed_submission_rewards(submission_id, user_id, safety_spot_id, point_transaction_id)
    values(v_submission.id, v_submission.user_id, v_spot_id, v_transaction_id);
  elsif p_decision = 'approved_existing' then
    if p_existing_safety_spot_id is null or not exists(
      select 1 from public.safety_spots where id = p_existing_safety_spot_id and facility_type = 'aed'
    ) then
      raise exception 'existing_aed_required' using errcode = '22023';
    end if;
    v_spot_id := p_existing_safety_spot_id;
    insert into public.aed_lifecycle_reports(
      safety_spot_id, report_type, reporter_user_id, description, photo_object_path,
      latitude, longitude, status, reviewed_by, reviewed_at
    ) values (
      v_spot_id,
      case when v_submission.submission_kind = 'information_update' then 'information_change' else 'existence_confirmed' end,
      v_submission.user_id, v_submission.installation_location, v_submission.photo_object_path,
      v_submission.latitude, v_submission.longitude, 'accepted', auth.uid(), now()
    );
  end if;

  update public.aed_submissions set
    status = p_decision,
    matched_safety_spot_id = v_spot_id,
    review_notes = nullif(left(trim(coalesce(p_review_notes,'')), 1000), ''),
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_submission_id;

  insert into public.admin_audit_log(action, target_type, target_id, detail, actor_user_id)
  values('aed_submission_' || p_decision, 'aed_submission', p_submission_id::text,
    jsonb_build_object('safety_spot_id', v_spot_id, 'points', case when p_decision = 'approved_new' then 30 else 0 end), auth.uid());

  return jsonb_build_object('submissionId', p_submission_id, 'decision', p_decision,
    'safetySpotId', v_spot_id, 'awardedPoints', case when p_decision = 'approved_new' then 30 else 0 end,
    'balance', v_balance);
end;
$$;

alter table public.aed_sources enable row level security;
alter table public.aed_import_batches enable row level security;
alter table public.aed_source_records enable row level security;
alter table public.aed_field_provenance enable row level security;
alter table public.aed_lifecycle_reports enable row level security;
alter table public.aed_submissions enable row level security;
alter table public.aed_submission_rewards enable row level security;

revoke all on public.aed_sources, public.aed_import_batches, public.aed_source_records,
  public.aed_field_provenance, public.aed_lifecycle_reports, public.aed_submissions,
  public.aed_submission_rewards from anon, authenticated;
grant select, insert on public.aed_submissions to authenticated;

create policy aed_submissions_owner_insert on public.aed_submissions
for insert to authenticated with check (user_id = auth.uid() and public.is_user_active(auth.uid()));
create policy aed_submissions_owner_read on public.aed_submissions
for select to authenticated using (user_id = auth.uid() or public.is_current_user_admin());

revoke all on function public.prepare_aed_submission() from public, anon, authenticated;
revoke all on function public.get_nearby_aed_candidates(double precision,double precision,integer,integer) from public;
revoke all on function public.admin_review_aed_submission(uuid,text,bigint,text) from public, anon, authenticated;
grant execute on function public.get_nearby_aed_candidates(double precision,double precision,integer,integer) to anon, authenticated;
grant execute on function public.admin_review_aed_submission(uuid,text,bigint,text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('aed-submission-images', 'aed-submission-images', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy aed_submission_images_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'aed-submission-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
create policy aed_submission_images_owner_read on storage.objects
for select to authenticated using (
  bucket_id = 'aed-submission-images'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_current_user_admin())
);
create policy aed_submission_images_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'aed-submission-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not exists(select 1 from public.aed_submissions s where s.photo_object_path = name)
);

commit;
