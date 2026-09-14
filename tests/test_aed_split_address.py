import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

class SplitAddressTests(unittest.TestCase):
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

if __name__=='__main__':unittest.main()
