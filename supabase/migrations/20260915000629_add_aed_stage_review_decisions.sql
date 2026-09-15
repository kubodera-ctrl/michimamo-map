alter table public.safety_spots_nationwide_stage
  add column if not exists review_decision text,
  add column if not exists review_reason text,
  add column if not exists review_next_action text,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'safety_spots_nationwide_stage_review_decision_check'
      and conrelid = 'public.safety_spots_nationwide_stage'::regclass
  ) then
    alter table public.safety_spots_nationwide_stage
      add constraint safety_spots_nationwide_stage_review_decision_check
      check (review_decision is null or review_decision in ('published', 'duplicate', 'hold'));
  end if;
end $$;

comment on column public.safety_spots_nationwide_stage.review_decision is
  'Step 2 triage result: published, duplicate, or hold.';
comment on column public.safety_spots_nationwide_stage.review_reason is
  'Evidence-based reason for the review decision.';
comment on column public.safety_spots_nationwide_stage.review_next_action is
  'Required follow-up for held candidates; none for terminal decisions.';
comment on column public.safety_spots_nationwide_stage.reviewed_at is
  'Timestamp of the latest explicit candidate decision.';
