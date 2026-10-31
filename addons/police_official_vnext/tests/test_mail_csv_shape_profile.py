import sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from mail_csv_shape_profile import profile_bytes

class CsvShapeSafetyTests(unittest.TestCase):
 def test_nonuniform_rows_report_only_counts(self):
  blob=('first,second\nPUBLIC,OK\nPRIVATE_PERSON,SECRET_FIELD,EXTRA\n').encode('utf-8')
  x=profile_bytes(blob)
  self.assertEqual(x['header_columns'],2)
  self.assertEqual(x['field_count_distribution'],{'2':1,'3':1})
  self.assertEqual(x['mismatched_rows'],1)
  self.assertEqual(x['mismatch_row_indices_first_12'],[2])
  self.assertNotIn('PRIVATE_PERSON',str(x))
  self.assertNotIn('SECRET_FIELD',str(x))
  self.assertFalse(x['license_or_publish_approved'])
 def test_regular_csv_still_review_only(self):
  x=profile_bytes('列A,列B\n1,2\n'.encode('cp932'))
  self.assertEqual(x['mismatched_rows'],0)
  self.assertEqual(x['encoding'],'cp932')
  self.assertEqual(x['profile_status'],'SCHEMA_ONLY_HOLD_NOT_IMPORTABLE')
 def test_html_not_csv(self):
  with self.assertRaises(ValueError):profile_bytes(b'<html>not official csv</html>')
 def test_duplicate_header_fails(self):
  with self.assertRaises(ValueError):profile_bytes(b'a,a\n1,2\n')
if __name__=='__main__':unittest.main()
