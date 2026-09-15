import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from io import BytesIO

import openpyxl

class SplitAddressTests(unittest.TestCase):
    def test_xlsx_blank_headers_get_stable_column_names(self):
        sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
        from import_aed_open_data import read_records
        workbook=openpyxl.Workbook();sheet=workbook.active
        sheet.append(('施設名','施設住所',None));sheet.append(('市役所','千葉市中央区','千葉港1-1'))
        payload=BytesIO();workbook.save(payload)
        self.assertEqual(read_records(payload.getvalue())[0]['__column_3'],'千葉港1-1')

    def test_html_download_is_not_treated_as_an_empty_dataset(self):
        sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
        from import_aed_open_data import read_records
        with self.assertRaises(ValueError):read_records(b'<html><body>Access check</body></html>')
    def test_official_split_address_and_mislabeled_prefecture(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);url='https://example.org/aed.csv'
            source={'prefecture':'山梨県','municipality':'北杜市','source_name':'市公式AED','source_url':'https://example.org/source','resource_url':url,'license_id':'CC-BY-4.0'}
            (p/'sources.json').write_text('{}');(p/'features.json').write_text('[]');(p/'supplement.json').write_text(json.dumps({'sources':[source]}))
            csv='名称 必須,所在地_都道府県,所在地_市区町村,所在地_町字,所在地_番地以下,緯度,経度\n図書館,山梨県,北杜市,大泉町,谷戸3000,35.862,138.388\n別県の施設,長野県,長野市,長野,1,36.65,138.18\n'
            (p/(hashlib.sha256(url.encode()).hexdigest()+'.bin')).write_text(csv)
            script=Path(__file__).resolve().parents[1]/'scripts/prepare_bodik_aed_review.py'
            subprocess.run([sys.executable,str(script),'--input-dir',str(p),'--supplement',str(p/'supplement.json')],check=True,capture_output=True)
            rows=json.loads((p/'review_rows.json').read_text())
            self.assertEqual(len(rows),1)
            self.assertEqual(rows[0]['address'],'山梨県北杜市大泉町谷戸3000')
            self.assertEqual(rows[0]['latitude'],35.862)
            self.assertFalse(rows[0]['active'])

    def test_geocode_backlog_prefers_manifest_municipality_over_county_label(self):
        sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
        from geocode_aed_coordinate_backlog import candidates
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);url='https://example.org/aed.csv'
            source={'prefecture':'奈良県','municipality':'田原本町','resource_url':url}
            csv='名称,所在地_連結表記,所在地_市区町村,緯度,経度\n町役場,奈良県磯城郡田原本町890-1,磯城郡田原本町,,\n'
            (p/(hashlib.sha256(url.encode()).hexdigest()+'.bin')).write_text(csv)
            result=candidates(p,{'sources':[source]})
            self.assertEqual(result[0][1]['cityName'],'田原本町')

    def test_geocoder_municipality_variants_are_accepted_safely(self):
        sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
        from geocode_aed_coordinate_backlog import municipality_matches
        self.assertTrue(municipality_matches('磯城郡田原本町','田原本町'))
        self.assertTrue(municipality_matches('千葉市中央区','千葉市'))
        self.assertFalse(municipality_matches('東大阪市','大阪市'))

    def test_geocode_backlog_skips_existing_swapped_coordinate_columns(self):
        sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
        from geocode_aed_coordinate_backlog import candidates
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory);url='https://example.org/aed.csv'
            source={'prefecture':'北海道','municipality':'根室市','resource_url':url}
            csv='名称,住所,緯度,経度\n市役所,北海道根室市常盤町2-27,145.58279,43.33021\n'
            (p/(hashlib.sha256(url.encode()).hexdigest()+'.bin')).write_text(csv)
            self.assertEqual(candidates(p,{'sources':[source]}),[])

if __name__=='__main__':unittest.main()
