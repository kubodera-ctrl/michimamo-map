import sys,json,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from national_theft_adapter import normalize,REGISTRY,METHODS
registry=json.loads(REGISTRY.read_text(encoding='utf-8'))
S=registry['sources'][0]
M={'municipality':'city','area':'place','kind':'theft','occurred_at':'event_date','source_record_id':'id'}
ROWS=[{'city':'札幌市','place':'架空エリア','theft':'自転車盗','event_date':'2026-08-02','id':'demo-001'}]

class NationalTheftTests(unittest.TestCase):
 def parse(self,rows=ROWS,mapping=M,registry=registry,source_url=S['source_page']):
  return normalize(rows,registry,jis='01',mapping=mapping,source_file_sha256='a'*64,source_url=source_url)
 def test_registry_is_exact_47(self):
  self.assertEqual(len(registry['sources']),47)
  self.assertEqual(len(set(x['jis'] for x in registry['sources'])),47)
 def test_only_theft_seven(self):
  self.assertEqual(len(METHODS),7)
  a=self.parse()['records'][0]
  self.assertEqual(a['theft_method'],'自転車盗')
  self.assertIsNone(a['latitude']);self.assertIsNone(a['longitude'])
  with self.assertRaises(ValueError):self.parse(rows=[{**ROWS[0],'theft':'痴漢'}])
 def test_no_auto_rights_or_points(self):
  a=self.parse()
  self.assertEqual(a['rights_status'],'unverified');self.assertFalse(a['publication_enabled'])
  self.assertEqual(a['records'][0]['review_status'],'pending')
  self.assertNotIn('points',str(a))
 def test_wrong_origin_or_schema_fails_closed(self):
  with self.assertRaises(ValueError):self.parse(source_url='https://example.com/')
  with self.assertRaises(ValueError):self.parse(mapping={**M,'kind':'other_column'})
 def test_date_not_inferred(self):
  no_date_mapping={k:v for k,v in M.items() if k!='occurred_at'}
  a=self.parse(mapping=no_date_mapping)['records'][0]
  self.assertIsNone(a['occurred_at'])
  with self.assertRaises(ValueError):self.parse(rows=[{**ROWS[0],'event_date':'令和8年'}])
 def test_missing_event_id_never_auto_public(self):
  a=self.parse(rows=[{**ROWS[0],'id':''}])['records'][0]
  self.assertEqual(a['review_status'],'pending_identity');self.assertFalse(a['identity_verified'])
if __name__=='__main__':unittest.main()
