import sys
import unittest
from pathlib import Path
from urllib.parse import urlencode
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from mail_form_minimal_export import parse_visible_date,safe_form_fields,verify_hidden_bound_date,DAY,NEXT

class MinimalPublicExportGateTests(unittest.TestCase):
 def good(self):return dict(sdate=DAY.isoformat(),edate=NEXT.isoformat(),format='csv',topic='',region='')
 def test_one_day_form_can_pass(self):
  self.assertTrue(safe_form_fields(urlencode(self.good())))
 def test_wide_or_wrong_date_blocked(self):
  for key,value in [('sdate','2026-01-01'),('edate','2026-11-01')]:
   d=self.good();d[key]=value;self.assertFalse(safe_form_fields(urlencode(d)))
 def test_unknown_form_fields_blocked(self):
  d=self.good();d['account']='abc';self.assertFalse(safe_form_fields(urlencode(d)))
 def test_wrong_format_blocks(self):
  d=self.good();d['format']='json';self.assertFalse(safe_form_fields(urlencode(d)))
 def test_missing_date_blocks(self):
  d=self.good();del d['sdate'];self.assertFalse(safe_form_fields(urlencode(d)))
 def test_datetime_safe_and_ambiguous_rejected(self):
  self.assertEqual(parse_visible_date('2026/10/20'),DAY)
  with self.assertRaises(ValueError):parse_visible_date('10/20/2026')
  with self.assertRaises(ValueError):parse_visible_date('1792454400')
 def test_dom_bound_exact(self):
  self.assertTrue(verify_hidden_bound_date(self.good()))
  self.assertFalse(verify_hidden_bound_date({'sdate':DAY.isoformat()}))
 if __name__=='__main__':unittest.main()
