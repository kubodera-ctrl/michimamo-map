begin;

-- 内部台帳はサービスロールとSECURITY DEFINER審査関数だけが扱う。
-- 明示的なdenyポリシーを置き、将来grantが追加されてもクライアントへ漏らさない。
create policy aed_sources_client_deny on public.aed_sources
for all to anon, authenticated using (false) with check (false);
create policy aed_import_batches_client_deny on public.aed_import_batches
for all to anon, authenticated using (false) with check (false);
create policy aed_source_records_client_deny on public.aed_source_records
for all to anon, authenticated using (false) with check (false);
create policy aed_field_provenance_client_deny on public.aed_field_provenance
for all to anon, authenticated using (false) with check (false);
create policy aed_lifecycle_reports_client_deny on public.aed_lifecycle_reports
for all to anon, authenticated using (false) with check (false);
create policy aed_submission_rewards_client_deny on public.aed_submission_rewards
for all to anon, authenticated using (false) with check (false);

commit;
