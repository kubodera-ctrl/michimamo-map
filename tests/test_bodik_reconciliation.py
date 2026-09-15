import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from reconcile_bodik_aed import reconcile
from prepare_bodik_aed_review import make_row, municipality_from_address, supplemental_coordinates
from geocode_aed_coordinate_backlog import candidates

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

    def test_standard_open_data_row_accepts_source_coordinates(self):
        source = {
            'prefecture': '福島県', 'municipality': '会津若松市',
            'source_name': 'test', 'source_url': 'https://example.test/dataset',
            'license_id': 'CC BY', 'source_updated_at': '2025-04-24',
        }
        row = make_row({
            'name': '市役所', 'address': '会津若松市東栄町3番46号',
            'prefectureName': '福島県', 'cityName': '会津若松市',
            'limitationOfUse': '',
        }, ['139.929', '37.494'], source, 'test')
        self.assertEqual(row['address'], '福島県会津若松市東栄町3番46号')
        self.assertEqual(row['municipality'], '会津若松市')

    def test_coordinate_backlog_prefixes_omitted_municipality(self):
        import hashlib
        import json
        import tempfile
        from pathlib import Path

        source = {
            'prefecture': '栃木県',
            'municipality': '下野市',
            'source_name': 'test',
            'source_url': 'https://example.test/dataset',
            'resource_url': 'https://example.test/aed.csv',
            'license_id': 'CC BY 4.0',
        }
        payload = '名称,住所\n市役所,笹原26番地\n'.encode('cp932')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cache = root / (hashlib.sha256(source['resource_url'].encode()).hexdigest() + '.bin')
            cache.write_bytes(payload)
            rows = candidates(root, {'sources': [source]})
        self.assertEqual(rows[0][1]['address'], '栃木県下野市笹原26番地')

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
