begin;

create table if not exists public.safety_spots_nationwide_stage
  (like public.safety_spots including defaults including generated including identity including constraints);

create unique index if not exists safety_spots_nationwide_stage_source_key_idx
  on public.safety_spots_nationwide_stage(source_key);

alter table public.safety_spots_nationwide_stage enable row level security;
revoke all on public.safety_spots_nationwide_stage from public, anon, authenticated;

comment on table public.safety_spots_nationwide_stage is
  '全国AED自動取込の審査用ステージング。公開MAPは参照しない。';

commit;
