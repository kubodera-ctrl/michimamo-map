"""Official evidence classification is fail closed; source links are not licenses."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REGISTER=json.loads((ROOT/'rights_evidence_registry_R8_REVIEW_ONLY.json').read_text(encoding='utf-8'))

class RightsEvidenceTests(unittest.TestCase):
 def test_file_evidence_is_not_auto_licensing(self):
  self.assertTrue(all(x['automatic_publication_allowed'] is False for x in REGISTER['datasets']))
  self.assertIn('REVIEW',REGISTER['status'])
 def test_prevent_cross_dataset_rights_reuse(self):
  rows={x['dataset']:x for x in REGISTER['datasets']}
  self.assertEqual(set(rows),{'mail','precursor','town_stats','nationwide_theft_seven'})
  self.assertIn('POLICY_CONFIRMED',rows['mail']['status'])
  self.assertIn('PENDING',rows['precursor']['status'])
  self.assertIn('2026_FILE_SCOPE_PENDING',rows['town_stats']['status'])
  self.assertIn('PER_PREFECTURE_PENDING',rows['nationwide_theft_seven']['status'])
 def test_cannot_borrow_historical_cc_by_for_new_data(self):
  historical=next(x for x in REGISTER['datasets'] if x['dataset']=='town_stats')
  self.assertIn('R5',historical['scope'])
  self.assertNotIn('LICENSE_VERIFIED_2026',historical['status'])
if __name__=='__main__':unittest.main()
