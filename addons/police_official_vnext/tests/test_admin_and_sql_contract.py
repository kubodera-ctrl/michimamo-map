"""Static boundary checks; NOT a substitute for hosted PostgreSQL/RLS tests."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SQL=(ROOT/'sql/NONPROD_PROPOSAL_NOT_APPLIED_police_publication_v3.sql').read_text()
HUB=(ROOT/'official-police-hub.js').read_text()

class PublicationSqlStatic(unittest.TestCase):
 def test_no_existing_business_tables_are_modified(self):
  for name in ('spots','point_transactions','profiles','auth_identities_michimamo','admin_users'):
   self.assertNotIn(f'alter table public.{name}',SQL.lower())
   self.assertNotIn(f'drop table public.{name}',SQL.lower())
 def test_default_off_and_no_release_enable_function(self):
  self.assertIn('enabled boolean not null default false',SQL)
  self.assertNotIn('set enabled=true',SQL.lower())
  self.assertNotIn('grant update on table public.police_official_release_gate to anon',SQL.lower())
 def test_rpcs_and_protected_roles(self):
  self.assertIn('grant execute on function public.police_stage_official_document(jsonb) to service_role;',SQL)
  self.assertNotIn('grant execute on function public.police_stage_official_document(jsonb) to anon',SQL)
  self.assertIn('perform public.admin_validate(p_password)',SQL)
  self.assertIn('not public.is_current_user_admin()',SQL)
  self.assertIn('revoke all on public.police_official_documents from public, anon, authenticated;',SQL)
  self.assertIn('enable row level security',SQL)
 def test_publication_filter_and_audit(self):
  for key in ("d.latest","d.review_status='approved'","d.rights_status='verified'","not d.is_fixture",
              'and exists(select 1 from public.police_official_release_gate'):
   self.assertIn(key,SQL)
  self.assertIn('before update or delete on public.police_official_review_audit',SQL)
  self.assertIn('insert into public.admin_audit_log(',SQL)
 def test_review_requires_exact_evidence_and_row_lock(self):
  self.assertIn('p_verified_source_sha256',SQL)
  self.assertIn('p_expected_hash',SQL)
  self.assertIn('for update;',SQL)
  self.assertIn('rights_evidence_url',SQL)
  self.assertIn('p_action not in',SQL)
 def test_existing_admin_script_no_points_calls(self):
  for keyword in ('submit_spot_once','admin_adjust_points','point_transactions','SNS_POST'):
   self.assertNotIn(keyword,HUB)
 def test_no_grant_public_table_write(self):
  self.assertNotIn('grant insert on public.police_official_documents to anon',SQL)
  self.assertNotIn('grant update on public.police_official_documents to authenticated',SQL)
if __name__=='__main__':unittest.main()
