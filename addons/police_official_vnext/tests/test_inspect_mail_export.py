"""The mail export schema probe must never emit row contents or grant publication."""
import json, unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from inspect_mail_export import inspect_bytes

class MailSchemaProbe(unittest.TestCase):
 def test_csv_columns_only_no_personal_values(self):
  data='受付ID,配信日,本文\nA-001,2026-10-31,PRIVATE_CASE_CONTENT\n'.encode('cp932')
  result=inspect_bytes(data,'csv')
  self.assertEqual(result['records'],1)
  self.assertEqual(result['encoding'],'cp932')
  self.assertIn('受付ID',result['columns'])
  self.assertNotIn('PRIVATE_CASE_CONTENT',json.dumps(result))
  self.assertFalse(result['publishable'])
  self.assertFalse(result['stable_official_record_id_verified'])
 def test_json_columns_only_no_personal_values(self):
  data=json.dumps([{'message_id':'demo','summary':'PERSONAL_SAMPLE'}],ensure_ascii=False).encode()
  obj=inspect_bytes(data,'json')
  self.assertEqual(obj['records'],1)
  self.assertNotIn('PERSONAL_SAMPLE',str(obj))
  self.assertFalse(obj['correction_and_withdrawal_contract_verified'])
 def test_malformed_and_unknown_no_fallback_to_live_source(self):
  for raw,ext in [(b'a,a\n1,2\n','csv'),(b'a\n','csv'),(b'{"records":[{},{}]}','json'),(b'irrelevant','html')]:
   with self.assertRaises(ValueError):inspect_bytes(raw,ext)
 def test_identifiers_not_inferred_from_column_name(self):
  raw='公式番号,訂正日\n123,2026-10-31\n'.encode('utf-8')
  result=inspect_bytes(raw,'csv')
  self.assertFalse(result['stable_official_record_id_verified'])
  self.assertFalse(result['dataset_rights_verified'])
if __name__=='__main__':unittest.main()
