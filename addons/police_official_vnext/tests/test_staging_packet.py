import sys,unittest,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from staging_packet import create_packet,documents_from_snapshot

class StagePacketTests(unittest.TestCase):
 def base(self):return {'schema_version':1,'dataset':'town_stats','publication_enabled':False,'releases':[
  {'year':2026,'through_month':9,'revision':1,'source_file_sha256':'b'*64,'records':[
   {'municipality':'港区','town':'台場一丁目','crime_type':'自転車盗','recognized_count_cumulative':2,'latitude':None,'longitude':None}]}]}
 def test_stats_off_by_default(self):
  packet=create_packet('town_stats',self.base())
  self.assertFalse(packet['publication_enabled']);self.assertFalse(packet['database_changes'])
  doc=packet['documents'][0]
  self.assertTrue(doc['is_fixture']);self.assertEqual(doc['record_key'],'town_stats:2026:09')
 def test_real_input_still_not_approved(self):
  p=create_packet('town_stats',self.base(),fixture_default=False)
  self.assertFalse(p['documents'][0]['is_fixture'])
  self.assertNotIn('review_status',p['documents'][0])
 def test_no_unverified_location(self):
  s=self.base();s['releases'][0]['records'][0]['latitude']=35.6
  with self.assertRaises(ValueError):create_packet('town_stats',s)
 def test_mail_requires_receipt(self):
  sample={'schema_version':1,'source_id':'tokyo_mail_keishicho_opendata','records':[]}
  with self.assertRaises(ValueError):create_packet('mail',sample)
  p=create_packet('mail',sample,sha='c'*64)
  self.assertEqual(p['documents'],[])
 def test_cannot_import_public_snapshot(self):
  s=self.base();s['publication_enabled']=True
  with self.assertRaises(ValueError):create_packet('town_stats',s)
if __name__=='__main__':unittest.main()
