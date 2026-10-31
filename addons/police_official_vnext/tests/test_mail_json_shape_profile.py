import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from mail_json_shape_profile import profile_bytes

class JSONShapeTests(unittest.TestCase):
 def test_list_objects_no_values_leaked(self):
  obj=[{'date':'2026-10-20','body':'PRIVATE_VICTIM','id':'FAKE-1'},
       {'date':'2026-10-20','body':'SECRET_CASE','id':'FAKE-2'}]
  x=profile_bytes(json.dumps(obj).encode())
  self.assertEqual(x['data_rows'],2)
  self.assertEqual(x['record_key_union'],['body','date','id'])
  self.assertNotIn('PRIVATE_VICTIM',str(x));self.assertNotIn('SECRET_CASE',str(x))
  self.assertFalse(x['importable'])
 def test_object_with_one_array(self):
  x=profile_bytes(json.dumps({'records':[{'x':'PRIVATE'}],'total':1}).encode())
  self.assertEqual(x['array_selector'],'records')
  self.assertNotIn('PRIVATE',str(x))
 def test_ambiguous_object_holds(self):
  x=profile_bytes(b'{"a":[],"b":[]}')
  self.assertEqual(x['array_selector'],'unknown_object_shape')
 def test_invalid_json_rejected(self):
  with self.assertRaises(ValueError):profile_bytes(b'{bad')
if __name__=='__main__':unittest.main()
