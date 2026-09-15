import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_bodik_aed_review import make_row
from import_aed_open_data import read_records

class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.p={'name':'市役所','prefectureName':'北海道','cityName':'北見市','address':'北見市大通西3丁目'}
        self.source={'source_name':'自治体AED一覧','source_url':'https://example.org/source','license_id':'cc-by'}
    def test_missing_coordinates_are_not_invented(self):
        self.assertIsNone(make_row(self.p,None,self.source,'r'))
    def test_restricted_facilities_are_excluded(self):
        self.assertIsNone(make_row(dict(self.p,limitationOfUse='1'),[143.9,43.8],self.source,'r'))
    def test_unknown_date_stays_unknown_and_staged(self):
        row=make_row(self.p,[143.9,43.8],self.source,'r')
        self.assertIsNone(row['source_updated_at'])
        self.assertFalse(row['active'])
        self.assertEqual(row['address'],'北海道北見市大通西3丁目')
    def test_mismatching_prefecture_is_rejected(self):
        self.assertIsNone(make_row(dict(self.p,address='東京都千代田区1'),[139.7,35.6],self.source,'r'))
    def test_nonfinite_coordinates_are_rejected(self):
        self.assertIsNone(make_row(self.p,[float('nan'),43.8],self.source,'r'))
    def test_swapped_japanese_latitude_longitude_are_recovered(self):
        row=make_row(self.p,[35.9,135.9],self.source,'r')
        self.assertEqual((row['latitude'],row['longitude']),(35.9,135.9))
    def test_prefecture_can_be_recovered_from_official_municipality(self):
        row=make_row(dict(self.p,prefectureName='',cityName='',municipalityName='北海道北見市'),[143.9,43.8],self.source,'r')
        self.assertEqual(row['prefecture'],'北海道')
        self.assertEqual(row['municipality'],'北見市')
    def test_partial_address_uses_explicit_official_city_field(self):
        row=make_row(dict(self.p,address='大通西3丁目'),[143.9,43.8],self.source,'r')
        self.assertEqual(row['address'],'北海道北見市大通西3丁目')
    def test_conflicting_city_in_partial_address_is_rejected(self):
        self.assertIsNone(make_row(dict(self.p,address='札幌市中央区1'),[143.9,43.8],self.source,'r'))

    def test_tab_delimited_official_csv_is_detected(self):
        records=read_records('名称\t緯度\t経度\r\n市役所\t38.1\t140.9\r\n'.encode())
        self.assertEqual(records,[{'名称':'市役所','緯度':'38.1','経度':'140.9'}])

    def test_gis_alias_fields_can_form_a_review_row(self):
        row=make_row({'name':'学校','address':'新潟市南区新飯田1','prefectureName':'新潟県','cityName':'新潟市'},[138.9,37.7],self.source,'r')
        self.assertEqual(row['municipality'],'新潟市')

    def test_source_url_identifies_supplemental_rows(self):
        row=make_row(self.p,[143.9,43.8],self.source,'r')
        self.assertEqual(row['source_url'],self.source['source_url'])

if __name__=='__main__': unittest.main()
