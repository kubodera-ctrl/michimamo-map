import io, tempfile, unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from source_acquisition import discover_official_csv, inspect_header, verified_url, run
from cumulative_sources import reshape_wide_town_rows, normalize_rows

SOURCE='''<html><body><h2>月累計（令和8年）</h2><a href="./zencho.files/R8.9.csv">9月累計 前兆事案認知情報（CSVファイル）</a><a href="./zencho.files/R8.8.csv">8月累計 前兆事案認知情報（CSVファイル）</a></body></html>'''
STATS='''<html>月累計（令和8年）<a href="ninchikensu.files/R8.9.csv">9月累計 町丁別 CSVファイル</a></html>'''
class TestAcquisition(unittest.TestCase):
 def test_primary_source_links_no_url_guess(self):
  self.assertTrue(discover_official_csv(SOURCE,'precursor',2026,9).endswith('/zencho.files/R8.9.csv'))
  self.assertTrue(discover_official_csv(STATS,'town_stats',2026,9).endswith('/ninchikensu.files/R8.9.csv'))
 def test_ambiguous_blocks(self):
  duplicate=SOURCE.replace('</body>','<a href="zencho.files/some.csv">9月累計 CSV</a></body>')
  with self.assertRaisesRegex(ValueError,'ambiguous'):discover_official_csv(duplicate,'precursor',2026,9)
 def test_stale_year_blocks(self):
  with self.assertRaisesRegex(ValueError,'year'):discover_official_csv(SOURCE,'precursor',2025,9)
 def test_cross_origin_blocks(self):
  bad=SOURCE.replace('zencho.files/R8.9.csv','https://malicious.example.org/zencho.files/R8.9.csv')
  with self.assertRaisesRegex(ValueError,'missing'):discover_official_csv(bad,'precursor',2026,9)
  with self.assertRaises(ValueError):verified_url('http://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.files/R8.9.csv','precursor')
 def test_empty_and_malformed_csv_block(self):
  with self.assertRaises(ValueError):inspect_header(b'')
  with self.assertRaises(ValueError):inspect_header(b'name,name\na,b\n')
  with self.assertRaises(ValueError):inspect_header(b'name,count\na\n')
  with self.assertRaises(ValueError):inspect_header(b'name,count\n')
 def test_real_encoding_detected_only_not_guessed(self):
  b='警察署,発生日\n中央,2026-09-25\n'.encode('cp932')
  v=inspect_header(b)
  self.assertEqual(v['encoding'],'cp932');self.assertEqual(v['rows'],1);self.assertEqual(v['rights_status'],'unverified');self.assertFalse(v['public_release'])
 def test_offline_acquisition_private_only(self):
  with tempfile.TemporaryDirectory() as td:
   d=Path(td);h=d/'page.html';c=d/'data.csv'
   h.write_text(SOURCE,encoding='utf-8');c.write_text('field,count\na,1\n',encoding='utf-8')
   receipt=run(dataset='precursor',year=2026,month=9,offline_page=h,offline_csv=c,private_dir=d/'source_private')
   self.assertTrue(receipt['verified_csv_contents']);self.assertFalse(receipt['publishing'])
   self.assertEqual(len(list((d/'source_private').glob('*.csv'))),1)
   b=(d/'source_private').glob('*.csv');p=next(b);h0=p.read_bytes()
   run(dataset='precursor',year=2026,month=9,offline_page=h,offline_csv=c,private_dir=d/'source_private')
   self.assertEqual(p.read_bytes(),h0)
   with self.assertRaisesRegex(ValueError,'Private directory'):
    run(dataset='precursor',year=2026,month=9,offline_page=h,offline_csv=c,private_dir=d/'site')
 def test_fail_does_not_change_old_files(self):
  with tempfile.TemporaryDirectory() as td:
   d=Path(td);h=d/'page.html';c=d/'data.csv';old=d/'source_private'/'old.csv'
   old.parent.mkdir();old.write_bytes(b'old');h.write_text(SOURCE,encoding='utf-8');c.write_text('invalid\na,b\n',encoding='utf-8')
   with self.assertRaises(ValueError):run(dataset='precursor',year=2026,month=9,offline_page=h,offline_csv=c,private_dir=old.parent)
   self.assertEqual(old.read_bytes(),b'old')
 def test_wide_town_pivot_requires_exact_columns(self):
  raw=[{'area':'港区','town':'台場一丁目','bikes':'2','cars':'0'}, {'area':'港区','town':'台場二丁目','bikes':'3','cars':'1'}]
  schema={'municipality':'area','town':'town','metrics':{'自転車盗':'bikes','自動車盗':'cars'}}
  res=reshape_wide_town_rows(raw,schema)
  self.assertEqual(len(res),4)
  self.assertEqual(sum(int(r['count']) for r in res),6)
  normalized=normalize_rows(res,dataset='town_stats',mapping={'municipality':'municipality','town':'town','crime_type':'crime_type','count':'count'},year=2026,through_month=9)
  self.assertTrue(all(r['latitude'] is None for r in normalized))
  with self.assertRaises(ValueError):reshape_wide_town_rows(raw,{**schema,'metrics':{'違う': 'nonexistent'}})
  with self.assertRaises(ValueError):reshape_wide_town_rows([{**raw[0],'bikes':'-3'}],schema)
if __name__=='__main__':unittest.main()
