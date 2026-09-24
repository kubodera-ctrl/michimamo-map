begin;

create table if not exists public.video_media_assets (
  id uuid primary key default gen_random_uuid(),
  news_key text not null,
  media_url text not null,
  media_source_name text not null,
  duration_seconds numeric(10,3),
  rights_level text not null check (rights_level in (
    'SELF_OWNED','EXPLICIT_PERMISSION','PUBLIC_LICENSE','CC_BY','PUBLIC_DOMAIN','REVIEW','BLOCKED'
  )),
  media_use_modes text[] not null default '{}',
  commercial_use_allowed boolean not null default false,
  modification_allowed boolean not null default false,
  audio_allowed boolean not null default false,
  source_ui_free boolean not null default false,
  attribution_required boolean not null default false,
  attribution_text text,
  rights_evidence_url text,
  rights_checked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists video_media_assets_news_url_uidx
  on public.video_media_assets(news_key, media_url);

create table if not exists public.video_render_jobs (
  id uuid primary key default gen_random_uuid(),
  news_key text not null,
  template_version text not null default 'machimamo-card-v2',
  format text not null check (format in ('short','long')),
  input_payload jsonb not null,
  status text not null default 'draft' check (status in (
    'draft','rights_review','ready_to_preview','approved','rendering','qc','rendered','publish_ready','blocked','failed'
  )),
  rights_decision jsonb not null default '{}'::jsonb,
  publish_eligible boolean not null default false,
  human_review_required boolean not null default false,
  render_provider text not null default 'remotion_lambda',
  provider_render_id text,
  provider_bucket text,
  output_storage_path text,
  error_message text,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  render_started_at timestamptz,
  render_finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_render_jobs_status_idx
  on public.video_render_jobs(status, created_at desc);
create index if not exists video_render_jobs_news_idx
  on public.video_render_jobs(news_key, created_at desc);

create table if not exists public.video_render_outputs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.video_render_jobs(id) on delete cascade,
  kind text not null check (kind in ('mp4','preview','metadata','rights','attribution','qc')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  width integer,
  height integer,
  fps numeric(8,3),
  duration_seconds numeric(10,3),
  qc_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists video_render_outputs_job_idx
  on public.video_render_outputs(job_id, kind);

alter table public.video_media_assets enable row level security;
alter table public.video_render_jobs enable row level security;
alter table public.video_render_outputs enable row level security;

drop policy if exists video_media_assets_admin on public.video_media_assets;
create policy video_media_assets_admin
  on public.video_media_assets
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists video_render_jobs_admin on public.video_render_jobs;
create policy video_render_jobs_admin
  on public.video_render_jobs
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists video_render_outputs_admin on public.video_render_outputs;
create policy video_render_outputs_admin
  on public.video_render_outputs
  for all
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

create or replace function public.admin_video_create_job(
  p_news_key text,
  p_format text,
  p_input_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_format not in ('short','long') then
    raise exception 'invalid_format' using errcode = '22023';
  end if;

  insert into public.video_render_jobs(
    news_key, format, input_payload, status, created_by
  )
  values(
    left(trim(p_news_key),180),
    p_format,
    coalesce(p_input_payload,'{}'::jsonb),
    'draft',
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_video_create_job(text,text,jsonb) from public, anon;
grant execute on function public.admin_video_create_job(text,text,jsonb) to authenticated;

create or replace function public.admin_video_approve_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  update public.video_render_jobs
     set status='approved',
         approved_by=auth.uid(),
         approved_at=now(),
         updated_at=now()
   where id=p_job_id
     and status in ('ready_to_preview','rights_review','draft');

  if not found then
    raise exception 'video_job_not_approvable' using errcode='P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.admin_video_approve_job(uuid) from public, anon;
grant execute on function public.admin_video_approve_job(uuid) to authenticated;

commit;
