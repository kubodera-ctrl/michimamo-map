"""Tests the exact HEADERS observed by the public-only GitHub Actions probe.
All row VALUES are synthetic. No real crime, victims, places or coordinates.
"""
import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from cumulative_sources import run,reshape_verified_precursor_cumulative,reshape_verified_combined_town_rows
PROFILE=json.loads((ROOT/'fixtures/keishicho_2026_09_verified_headers_ONLY.json').read_text())
PRE=json.loads((ROOT/'fixtures/keishicho_2026_09_precursor_mapping_REVIEW_ONLY.json').read_text())
TOWN=json.loads((ROOT/'fixtures/keishicho_2026_09_town_mapping_REVIEW_ONLY.json').read_text())

class VerifiedSchemaTests(unittest.TestCase):
 def test_headers_and_source_provenance_are_pinned(self):
  self.assertEqual(len(PROFILE['precursor']['columns']),11)
  self.assertEqual(len(PROFILE['town_stats']['columns']),38)
  self.assertEqual(PROFILE['precursor']['rows'],3791)
  self.assertEqual(PROFILE['town_stats']['rows'],5201)
  self.assertFalse(PROFILE['publication_approved'])
  self.assertEqual(PROFILE['town_stats']['encoding'],'utf-8-sig')
  self.assertEqual(PROFILE['precursor']['encoding'],'cp932')
  self.assertTrue(PROFILE['precursor']['sha256'].startswith('c6fa66'))
 def test_precursor_same_rows_counted_as_csv_lines_not_unique_incidents(self):
  self.assertTrue(set(PRE['precursor_aggregate_columns'].values()).issubset(set(PROFILE['precursor']['columns'])))
  sample=[{'発生区市町村':'架空区','発生場所':'路上','事案名':'声かけ',
           '被害者性別':'PRIVATE_VICTIM_NOT_FOR_PUBLICATION','発生場所詳細':'DONT_PUBLISH_EXACT_PLACE'},
          {'発生区市町村':'架空区','発生場所':'路上','事案名':'声かけ',
           '被害者性別':'PRIVATE_VICTIM_NOT_FOR_PUBLICATION','発生場所詳細':'DONT_PUBLISH_EXACT_PLACE'},
          {'発生区市町村':'架空区','発生場所':'公園','事案名':'つきまとい',
           '被害者性別':'PRIVATE_VICTIM_NOT_FOR_PUBLICATION','発生場所詳細':'DONT_PUBLISH_EXACT_PLACE'}]
  aggregated=reshape_verified_precursor_cumulative(sample,PRE['precursor_aggregate_columns'])
  self.assertEqual(len(aggregated),2)
  self.assertEqual(sum(int(a['recognized_count_cumulative']) for a in aggregated),3)
  self.assertNotIn('PRIVATE_VICTIM_NOT_FOR_PUBLICATION',str(aggregated))
  with tempfile.TemporaryDirectory() as d:
   d=Path(d);fieldnames=list(PROFILE['precursor']['columns']);data=d/'precursor.csv'
   with data.open('w',encoding='cp932',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fieldnames);w.writeheader();w.writerows([{k:v for k,v in row.items() if k in fieldnames} for row in sample])
   conf=d/'map.json';conf.write_text(json.dumps(PRE,ensure_ascii=False),encoding='utf-8')
   report=run(data,conf,d/'snapshot.json',d/'receipt.json',dataset='precursor',year=2026,through_month=9)
   self.assertEqual(report['records_in_release'],2)
   snap=json.loads((d/'snapshot.json').read_text());self.assertFalse(snap['publication_enabled'])
   for rec in snap['releases'][0]['records']:
    self.assertEqual(rec['location_precision'],'municipality')
    self.assertIsNone(rec['latitude']);self.assertIsNone(rec['longitude'])
    self.assertEqual(rec['record_count_basis'],'official_csv_rows_cumulative_not_unique_incidents')
    self.assertNotIn('発生場所詳細',str(rec));self.assertNotIn('被害者性別',str(rec))
 def test_town_single_column_full_area_preserved_no_geocoding(self):
  self.assertTrue(set(TOWN['combined_town_columns']['metrics'].values()).issubset(set(PROFILE['town_stats']['columns'])))
  row={name:'0' for name in PROFILE['town_stats']['columns']}
  row['市区町丁']='架空区架空一丁目';row['非侵入窃盗自転車盗']='7'
  pivot=reshape_verified_combined_town_rows([row],TOWN['combined_town_columns'])
  self.assertEqual(len(pivot),len(TOWN['combined_town_columns']['metrics']))
  self.assertEqual([x['count'] for x in pivot if x['crime_type']=='自転車盗'],['7'])
  self.assertTrue(all(x['municipality']=='東京都' and x['town']=='架空区架空一丁目' for x in pivot))
  row2={**row,'非侵入窃盗自転車盗':'-'}
  with self.assertRaises(ValueError):reshape_verified_combined_town_rows([row2],TOWN['combined_town_columns'])
  mixed=reshape_verified_combined_town_rows([row,{**row,'市区町丁':'合計'}],TOWN['combined_town_columns'])
  self.assertEqual(mixed,pivot)
  with self.assertRaises(ValueError):reshape_verified_combined_town_rows([{**row,'市区町丁':'合計'}],TOWN['combined_town_columns'])
 def test_counts_and_privacy_held_on_unknown_real_contract(self):
  fake=[{'発生区市町村':'','発生場所':'不明','事案名':'声かけ'}]
  with self.assertRaises(ValueError):reshape_verified_precursor_cumulative(fake,PRE['precursor_aggregate_columns'])
  self.assertEqual(PRE['dataset'],'precursor');self.assertEqual(TOWN['dataset'],'town_stats')

if __name__=='__main__':unittest.main()
