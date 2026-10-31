import json, sys, tempfile, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from cumulative_sources import decode_csv,normalize_rows,update_history,run, SOURCE_PAGES

class CumulativeTests(unittest.TestCase):
 def stats(self, count='3'):
  return [{'ward':'港区','town':'台場一丁目','type':'自転車盗','number':count}]
 def precursor(self):
  return [{'ward':'江東区','area':'区域内','kind':'声かけ','published':'2026-09-21'}]
 def mapping(self): return {'municipality':'ward','town':'town','crime_type':'type','count':'number'}
 def test_count_zero_and_no_pin(self):
  r=normalize_rows(self.stats('0'),dataset='town_stats',mapping=self.mapping(),year=2026,through_month=9)
  self.assertEqual(r[0]['recognized_count_cumulative'],0)
  self.assertIsNone(r[0]['latitude']); self.assertIsNone(r[0]['longitude'])
 def test_negative_count_forbidden(self):
  with self.assertRaises(ValueError):normalize_rows(self.stats('-1'),dataset='town_stats',mapping=self.mapping(),year=2026,through_month=9)
 def test_ambiguous_column_mapping_forbidden(self):
  with self.assertRaises(ValueError):normalize_rows(self.stats(),dataset='town_stats',mapping={'municipality':'ward','town':'town','crime_type':'type','count':'count_nonexistent'},year=2026,through_month=9)
 def test_precursor_id_unverified(self):
  r=normalize_rows(self.precursor(),dataset='precursor',mapping={'municipality':'ward','area_label':'area','event_type':'kind','published_at':'published'},year=2026,through_month=9)
  self.assertEqual(r[0]['review_status'],'pending_identity')
  self.assertNotIn('summary',r[0]);self.assertIsNone(r[0]['latitude'])
 def test_cumulative_not_add(self):
  base={'dataset':'town_stats','year':2026,'through_month':8,'revision':1,'content_hash':'old','records':[{'municipality':'港区','town':'台場一丁目','crime_type':'自転車盗','recognized_count_cumulative':3}], 'review_status':'approved','fetched_at':'2026-10-31T00:00:00Z'}
  new={**base,'through_month':9,'revision':1,'content_hash':'new','records':[{'municipality':'港区','town':'台場一丁目','crime_type':'自転車盗','recognized_count_cumulative':7}]}
  old,_=update_history(None,base)
  snap,receipt=update_history(old,new)
  self.assertEqual(receipt['periods'],2)
  self.assertEqual([v['records'][0]['recognized_count_cumulative'] for v in snap['releases']],[3,7])
  self.assertFalse(new['requires_review'])
 def test_decrease_requires_review(self):
  base={'dataset':'town_stats','year':2026,'through_month':8,'revision':1,'content_hash':'old','records':[{'municipality':'港区','town':'台場一丁目','crime_type':'自転車盗','recognized_count_cumulative':8}], 'review_status':'approved','fetched_at':'2026-10-31T00:00:00Z'}
  new={**base,'through_month':9,'revision':1,'content_hash':'new','records':[{'municipality':'港区','town':'台場一丁目','crime_type':'自転車盗','recognized_count_cumulative':7}]}
  old,_=update_history(None,base); snap,_=update_history(old,new)
  self.assertTrue(new['requires_review']);self.assertEqual(new['review_flags']['cumulative_decreases'],1)
 def test_quarantine_survives_comparison_with_previous_month(self):
  # Regression: the prior implementation overwrote requires_review=False
  # whenever counts increased, clearing the held ambiguous-area warning.
  old_rel={'dataset':'town_stats','year':2026,'through_month':8,'revision':1,
           'content_hash':'aug','records':[{'municipality':'東京都','town':'架空一丁目',
             'crime_type':'自転車盗','recognized_count_cumulative':2}],
           'review_status':'approved','fetched_at':'2026-10-31T00:00:00Z'}
  old_snap,_=update_history(None,old_rel)
  next_rel={**old_rel,'through_month':9,'content_hash':'sep',
            'records':[{'municipality':'東京都','town':'架空一丁目',
             'crime_type':'自転車盗','recognized_count_cumulative':3}],
            'review_status':'pending','requires_review':True,
            'review_flags':{'ambiguous_area_rows_held':2,'ambiguous_area_labels_held':1}}
  merged,_=update_history(old_snap,next_rel)
  current=merged['releases'][-1]
  self.assertTrue(current['requires_review'])
  self.assertEqual(current['review_flags']['ambiguous_area_rows_held'],2)
  self.assertEqual(current['review_flags']['ambiguous_area_labels_held'],1)
  self.assertEqual(current['review_flags']['cumulative_decreases'],0)
  self.assertEqual(current['review_flags']['missing_groups'],0)
 def test_quarantine_and_count_regression_both_preserved(self):
  base={'dataset':'town_stats','year':2026,'through_month':8,'revision':1,
        'content_hash':'aug','records':[{'municipality':'東京都','town':'架空一丁目',
           'crime_type':'自転車盗','recognized_count_cumulative':5}],
        'review_status':'approved','fetched_at':'2026-10-31T00:00:00Z'}
  snap,_=update_history(None,base)
  nxt={**base,'through_month':9,'content_hash':'sep',
       'records':[{'municipality':'東京都','town':'架空一丁目',
           'crime_type':'自転車盗','recognized_count_cumulative':4}],
       'requires_review':True,'review_flags':{'ambiguous_area_rows_held':2}}
  update_history(snap,nxt)
  self.assertTrue(nxt['requires_review'])
  self.assertEqual(nxt['review_flags']['ambiguous_area_rows_held'],2)
  self.assertEqual(nxt['review_flags']['cumulative_decreases'],1)
 def test_same_period_correction_requires_review(self):
  rel={'dataset':'town_stats','year':2026,'through_month':9,'revision':1,'content_hash':'a','records':[],'fetched_at':'2026-10-31T00:00:00Z'}
  old,_=update_history(None,rel.copy())
  corrected={**rel,'content_hash':'b'}
  new,rc=update_history(old,corrected)
  self.assertEqual(rc['revised_release'],1);self.assertEqual(corrected['review_status'],'pending_correction')
  self.assertEqual(len(new['releases']),2)
 def test_duplicate_file_keeps_bytes(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d)
   (d/'data.csv').write_text('ward,town,type,number\n港区,台場一丁目,自転車盗,4\n',encoding='utf-8')
   (d/'map.json').write_text(json.dumps({'dataset':'town_stats','columns':self.mapping()}),encoding='utf-8')
   kw=dict(dataset='town_stats',year=2026,through_month=9)
   run(d/'data.csv',d/'map.json',d/'snapshot.json',d/'report.json',**kw)
   raw=(d/'snapshot.json').read_bytes()
   run(d/'data.csv',d/'map.json',d/'snapshot.json',d/'report.json',**kw)
   self.assertEqual((d/'snapshot.json').read_bytes(),raw)
   self.assertEqual(json.loads((d/'report.json').read_text())['duplicate_release'],1)
 def test_malformed_file_does_not_override_old(self):
  with tempfile.TemporaryDirectory() as d:
   d=Path(d)
   (d/'data.csv').write_text('ward,town,type,number\n港区,台場一丁目,自転車盗,4\n',encoding='utf-8')
   (d/'map.json').write_text(json.dumps({'dataset':'town_stats','columns':self.mapping()}),encoding='utf-8')
   kw=dict(dataset='town_stats',year=2026,through_month=9)
   run(d/'data.csv',d/'map.json',d/'snapshot.json',d/'report.json',**kw)
   raw=(d/'snapshot.json').read_bytes()
   (d/'data.csv').write_text('invalid\ntext\n',encoding='utf-8')
   with self.assertRaises(ValueError):run(d/'data.csv',d/'map.json',d/'snapshot.json',d/'report.json',**kw)
   self.assertEqual((d/'snapshot.json').read_bytes(),raw)
 def test_cp932_csv(self):
  raw='ward,town,type,number\n港区,台場一丁目,自転車盗,4\n'.encode('cp932')
  self.assertEqual(decode_csv(raw)[0]['ward'],'港区')
 def test_unknown_dataset_forbidden(self):
  with self.assertRaises(ValueError):normalize_rows(self.stats(),dataset='bad',mapping=self.mapping(),year=2026,through_month=9)
 def test_csv_duplicate_columns_forbidden(self):
  with self.assertRaises(ValueError):decode_csv(b'foo,foo\n1,2\n')
 def test_two_sources_different_licenses(self):
  self.assertNotEqual(SOURCE_PAGES['precursor'],SOURCE_PAGES['town_stats'])
  r=normalize_rows(self.stats(),dataset='town_stats',mapping=self.mapping(),year=2026,through_month=9)[0]
  self.assertEqual(r['rights_status'],'unverified')
if __name__=='__main__': unittest.main()
