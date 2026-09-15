import unittest

from fetch_aed_dev14_catalogs import links, metadata, resource_rank


class FetchAedDev14CatalogsTest(unittest.TestCase):
    def test_extracts_download_metadata(self):
        page = """
        <h1>リソース名 【川越市】AED設置箇所一覧（令和7年3月31日現在）UTF-8</h1>
        <div>ファイル名 112011_aed.csv</div>
        <table><tr><td>最終更新</td><td>2025年07月08日</td></tr>
        <tr><td>形式</td><td>CSV</td></tr><tr><td>ライセンス</td><td>PDL1.0</td></tr></table>
        <a href="/resource_download/6471">ダウンロード</a>
        """.encode()
        result = metadata(page, "https://example.jp/resources/6471")
        self.assertEqual(result["download_url"], "https://example.jp/resource_download/6471")
        self.assertEqual(result["filename"], "112011_aed.csv")
        self.assertEqual(result["updated_at"], "2025-07-08")
        self.assertEqual(result["format"], "CSV")

    def test_prefers_newer_then_utf8_tabular_resource(self):
        older = {"updated_at": "2024-03-01", "format": "CSV", "resource_title": "UTF-8"}
        newer_sjis = {"updated_at": "2025-03-31", "format": "CSV", "resource_title": "Shift_JIS"}
        newer_utf8 = {"updated_at": "2025-03-31", "format": "CSV", "resource_title": "UTF-8"}
        self.assertEqual(max([older, newer_sjis, newer_utf8], key=resource_rank), newer_utf8)


if __name__ == "__main__":
    unittest.main()
