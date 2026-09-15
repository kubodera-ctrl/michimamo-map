import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from reconcile_bodik_aed import reconcile
from prepare_bodik_aed_review import municipality_from_address, supplemental_coordinates

class ReconciliationTests(unittest.TestCase):
    def test_extracts_physical_municipality_from_address(self):
        self.assertEqual(municipality_from_address('岩手県','岩手県滝沢市穴口328'),'滝沢市')
        self.assertEqual(municipality_from_address('岩手県','岩手県胆沢郡金ケ崎町西根'),'金ケ崎町')
        self.assertEqual(municipality_from_address('山形県','山形県(冬)米沢市舘山'),'米沢市')

    def test_splits_combined_latitude_longitude(self):
        self.assertEqual(
            supplemental_coordinates({'緯度、経度':'38.25, 140.33'}),
            ['140.33','38.25'],
        )

    def setUp(self):
        self.old={'name':'市役所','address':'東京都青梅市1','latitude':35.7,'longitude':139.3}
    def test_existing_address_is_excluded_even_with_different_coordinates(self):
        rows,reasons=reconcile([dict(self.old,latitude=35.8)],[self.old])
        self.assertEqual(rows,[])
        self.assertEqual(reasons['existing_name_address'],1)
    def test_nearby_related_name_is_excluded(self):
        rows,reasons=reconcile([dict(self.old,name='市役所本館',address='東京都青梅市2',latitude=35.7001)],[self.old])
        self.assertEqual(rows,[])
        self.assertEqual(reasons['existing_near_duplicate'],1)
    def test_distinct_facility_survives_and_stays_inactive(self):
        new=dict(self.old,name='図書館',active=False)
        rows,reasons=reconcile([new],[self.old])
        self.assertEqual(rows,[new])
        self.assertFalse(rows[0]['active'])
    def test_internal_candidate_is_excluded(self):
        rows,reasons=reconcile([dict(self.old,duplicate_candidate=True)],[])
        self.assertEqual(rows,[])

if __name__=='__main__':unittest.main()
