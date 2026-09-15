import unittest

from unittest.mock import patch

from fetch_aed_dev14_catalogs import api_profiles, catalog_api_url, metadata, queued_catalogs, resource_rank
from import_aed_open_data import ADDRESS_FIELDS, LATITUDE_FIELDS, LONGITUDE_FIELDS, NAME_FIELDS, PHONE_FIELDS, first_value


class FetchAedDev14CatalogsTest(unittest.TestCase):
    def test_common_regional_profile_fields_are_supported(self):
        row = {
            "設置場所_名称": "市役所",
            "設置場所_住所": "〇〇市1-1",
            "設置場所_緯度": "35.0",
            "設置場所_経度": "139.0",
            "設置場所_電話番号": "000-0000",
        }
        self.assertEqual(first_value(row, NAME_FIELDS), "市役所")
        self.assertEqual(first_value(row, ADDRESS_FIELDS), "〇〇市1-1")
        self.assertEqual(first_value(row, LATITUDE_FIELDS), "35.0")
        self.assertEqual(first_value(row, LONGITUDE_FIELDS), "139.0")
        self.assertEqual(first_value(row, PHONE_FIELDS), "000-0000")

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

    def test_builds_dataeye_api_url(self):
        self.assertEqual(
            catalog_api_url("https://opendata.pref.chiba.lg.jp/datasets/3916"),
            "https://opendata.pref.chiba.lg.jp/ckan_api/package_show?id=3916",
        )

    def test_reads_resource_profiles_from_api(self):
        payload = b'{"result":{"resources":[{"id":6471,"title":"AED UTF-8","format":"csv","last_modified":"2025-07-08T00:00:00","url":"https://example.jp/resource_download/6471","resource_license_id":"pdl","size":"71237"}]}}'
        result = api_profiles(payload, "https://example.jp/datasets/8")
        self.assertEqual(result[0]["resource_url"], "https://example.jp/resources/6471")
        self.assertEqual(result[0]["format"], "CSV")
        self.assertEqual(result[0]["updated_at"], "2025-07-08")

    def test_recovery_sources_include_both_zero_count_municipalities(self):
        queue = [
            {"code": "12239", "municipality": "大網白里市", "status": "published_aed_present", "new_catalog_candidates": [{"url": "https://example.jp/oami"}]}
        ]
        with patch("fetch_aed_dev14_catalogs.QUEUE") as queue_path:
            queue_path.read_text.return_value = __import__("json").dumps(queue)
            result = queued_catalogs()
        self.assertEqual({x["municipality"] for x in result}, {"大網白里市", "大東市"})


if __name__ == "__main__":
    unittest.main()
