begin;

-- 投稿前候補検索は投稿可能なログイン利用者だけに限定する。
revoke all on function public.get_nearby_aed_candidates(double precision,double precision,integer,integer) from public, anon, authenticated;
grant execute on function public.get_nearby_aed_candidates(double precision,double precision,integer,integer) to authenticated;

drop policy if exists aed_submissions_owner_insert on public.aed_submissions;
create policy aed_submissions_owner_insert on public.aed_submissions
for insert to authenticated with check (
  user_id = (select auth.uid()) and public.is_user_active((select auth.uid()))
);

drop policy if exists aed_submissions_owner_read on public.aed_submissions;
create policy aed_submissions_owner_read on public.aed_submissions
for select to authenticated using (
  user_id = (select auth.uid()) or (select public.is_current_user_admin())
);

create index if not exists aed_import_batches_source_id_idx on public.aed_import_batches(source_id);
create index if not exists aed_import_batches_created_by_idx on public.aed_import_batches(created_by) where created_by is not null;
create index if not exists aed_source_records_safety_spot_id_idx on public.aed_source_records(safety_spot_id) where safety_spot_id is not null;
create index if not exists aed_field_provenance_source_record_id_idx on public.aed_field_provenance(source_record_id);
create index if not exists aed_lifecycle_reports_spot_status_idx on public.aed_lifecycle_reports(safety_spot_id, status);
create index if not exists aed_lifecycle_reports_reporter_idx on public.aed_lifecycle_reports(reporter_user_id) where reporter_user_id is not null;
create index if not exists aed_lifecycle_reports_reviewer_idx on public.aed_lifecycle_reports(reviewed_by) where reviewed_by is not null;
create index if not exists aed_submissions_matched_spot_idx on public.aed_submissions(matched_safety_spot_id) where matched_safety_spot_id is not null;
create index if not exists aed_submissions_duplicate_idx on public.aed_submissions(duplicate_of_submission_id) where duplicate_of_submission_id is not null;
create index if not exists aed_submissions_reviewer_idx on public.aed_submissions(reviewed_by) where reviewed_by is not null;
create index if not exists aed_submission_rewards_user_idx on public.aed_submission_rewards(user_id);

comment on table public.aed_sources is 'サービスロール専用のAED情報源・ライセンス台帳。RLSによりクライアントアクセスを拒否する。';
comment on table public.aed_import_batches is 'サービスロール専用の原本・検証・公開・復旧バッチ台帳。';
comment on table public.aed_source_records is 'サービスロール専用の原本行と正規化結果の追跡台帳。';
comment on table public.aed_field_provenance is 'サービスロール専用の項目単位出典台帳。';
comment on table public.aed_submission_rewards is '管理者承認RPC専用。1投稿・1公開AED・1ポイント取引の一意制約で二重付与を防ぐ。';

commit;
