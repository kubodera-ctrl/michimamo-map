import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from import_nationwide_aed import (  # noqa: E402
    has_denied_provenance,
    licence_allowed,
    mark_duplicates,
    municipality_from,
    prefecture_from,
)


class NationwideAedImporterTest(unittest.TestCase):
    def test_requires_reusable_license(self):
        self.assertTrue(licence_allowed({"license_id": "cc-by", "license_title": "CC BY 4.0"}))
        self.assertFalse(licence_allowed({"license_id": "other-open", "license_title": "利用条件参照"}))

    def test_rejects_unclear_nationwide_map_provenance(self):
        package = {"notes": "日本救急医療財団 全国AEDマップを利用"}
        resource = {"url": "https://www.qqzaidanmap.jp/example.csv"}
        self.assertTrue(has_denied_provenance(package, resource))

    def test_extracts_prefecture_and_municipality(self):
        prefecture, code = prefecture_from("神奈川県横浜市中区本町1", {})
        self.assertEqual((prefecture, code), ("神奈川県", "14"))
        self.assertEqual(municipality_from("神奈川県横浜市中区本町1", prefecture), "横浜市")

    def test_flags_near_similar_names_without_deleting(self):
        rows = [
            {"source_key": "a", "name": "中央市役所", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0},
            {"source_key": "b", "name": "中央市役所 AED", "address": "東京都千代田区1-1", "latitude": 35.0001, "longitude": 139.0001},
            {"source_key": "c", "name": "別施設", "address": "東京都千代田区2", "latitude": 35.2, "longitude": 139.2},
        ]
        kept, exact_removed, pairs = mark_duplicates(rows)
        self.assertEqual((len(kept), exact_removed, pairs), (3, 0, 1))
        self.assertTrue(kept[0]["duplicate_candidate"])
        self.assertTrue(kept[1]["duplicate_candidate"])


if __name__ == "__main__":
    unittest.main()
