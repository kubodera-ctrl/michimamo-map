import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from collect_harp_aed_sources import SearchParser, detect_header_row, parse_dataset


class HarpSourceTests(unittest.TestCase):
    def test_parses_cc_by_csv_source(self):
        html = '''
        <h1 class="name">AED設置箇所一覧【留萌市】</h1>
        <a class="area">留萌市</a>
        <div class="resource"><div>012122_aed.csv (CSV)</div>
        <img alt="表示（CC BY）"><a class="download" href="https://example.jp/aed.csv" data-url="https://expired.example/aed.csv">DL</a></div>
        <dt>更新日時</dt><dd>2024-06-17<br/></dd>
        '''
        source = parse_dataset(html, "https://www.harp.lg.jp/opendata/dataset/2046.html")
        self.assertEqual(source["municipality"], "留萌市")
        self.assertEqual(source["resource_url"], "https://example.jp/aed.csv")
        self.assertEqual(source["source_updated_at"], "2024-06-17")

    def test_accepts_xlsx_when_csv_is_unavailable(self):
        html = '''<h1 class="name">AED一覧</h1><a class="area">剣淵町</a>
        <div class="resource"><img alt="表示（CC BY）">
        <a class="download" href="/dataset/1/resource/2/aed.xlsx">DL</a></div>'''
        source = parse_dataset(html, "https://www.harp.lg.jp/opendata/dataset/1.html")
        self.assertEqual(source["resource_url"], "https://www.harp.lg.jp/dataset/1/resource/2/aed.xlsx")

    def test_accepts_external_csv_link_and_title_municipality(self):
        html = '''<h1 class="name">AED設置場所【幌延町】</h1>
        <div class="resource"><div>AED設置場所 (CSV 外部リンク)</div><img alt="表示（CC BY）">
        <a class="download" href="/dataset/1/resource/2/source-url">DL</a></div>'''
        source = parse_dataset(html, "https://www.harp.lg.jp/opendata/dataset/1.html")
        self.assertEqual(source["municipality"], "幌延町")
        self.assertTrue(source["resource_url"].endswith("source-url"))

    def test_rejects_non_aed_and_prefecture_aggregate(self):
        self.assertIsNone(parse_dataset('<h1 class="name">道路</h1><a class="area">留萌市</a>', "x"))
        self.assertIsNone(parse_dataset('<h1 class="name">AED一覧</h1><a class="area">北海道</a>', "x"))

    def test_fullwidth_aed_title_is_accepted(self):
        html = '''<h1 class="name">ＡＥＤ設置位置【古平町】</h1><a class="area">古平町</a>
        <div class="resource"><div>aed.csv (CSV)</div><img alt="表示（CC BY）">
        <a class="download" href="/aed.csv">DL</a></div>'''
        self.assertEqual(parse_dataset(html, "x")["municipality"], "古平町")

    def test_detects_nonstandard_csv_header_row(self):
        payload = 'AED一覧,,,,\n,,,,\n市区町村名,施設名,住所,緯度,経度\n'.encode()
        self.assertEqual(detect_header_row(payload), 3)

    def test_supports_catalog_without_opendata_prefix(self):
        parser = SearchParser("https://opendata.pref.aomori.lg.jp")
        parser.feed('<a href="/dataset/2009.html">南部町</a>')
        self.assertEqual(parser.links, ["https://opendata.pref.aomori.lg.jp/dataset/2009.html"])

        html = '''<h1 class="name">【南部町】AED設置箇所一覧</h1><a class="area">南部町</a>
        <div class="resource"><img alt="表示（CC BY）">
        <a class="download" href="/dataset/2009/resource/24482/aed.xlsx">DL</a></div>'''
        source = parse_dataset(html, "https://opendata.pref.aomori.lg.jp/dataset/2009.html",
                               "青森県", "https://opendata.pref.aomori.lg.jp")
        self.assertEqual(source["prefecture"], "青森県")
        self.assertEqual(source["municipality"], "南部町")

    def test_parses_japanese_updated_date_with_classes(self):
        html = '''<h1 class="name">【南部町】AED設置箇所一覧</h1><a class="area">南部町</a>
        <div class="resource"><img alt="表示（CC BY）"><a class="download" href="/aed.csv">DL</a></div>
        <dt class="info-list__title">更新日時</dt><dd class="info-list__content">2026年6月10日</dd>'''
        source = parse_dataset(html, "x", "青森県", "https://opendata.pref.aomori.lg.jp")
        self.assertEqual(source["source_updated_at"], "2026-06-10")


if __name__ == "__main__":
    unittest.main()
