import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from import_nationwide_aed import mark_duplicates


class AedDuplicateLocationTests(unittest.TestCase):
    def test_same_facility_different_installation_locations_are_distinct(self):
        rows = [
            {"source_key": "a", "name": "市役所", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0, "installation_location": "1階玄関"},
            {"source_key": "b", "name": "市役所", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0, "installation_location": "3階受付"},
        ]
        kept, exact_removed, duplicate_pairs = mark_duplicates(rows)
        self.assertEqual(len(kept), 2)
        self.assertEqual(exact_removed, 0)
        self.assertEqual(duplicate_pairs, 0)
        self.assertTrue(all(not row.get("duplicate_candidate", False) for row in kept))

    def test_exact_same_installation_is_collapsed(self):
        rows = [
            {"source_key": "a", "name": "市役所", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0, "installation_location": "1階玄関"},
            {"source_key": "b", "name": "市役所", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0, "installation_location": "1階玄関"},
        ]
        kept, exact_removed, duplicate_pairs = mark_duplicates(rows)
        self.assertEqual(len(kept), 1)
        self.assertEqual(exact_removed, 1)
        self.assertEqual(duplicate_pairs, 0)

    def test_related_facility_names_at_same_address_with_distinct_locations_are_distinct(self):
        rows = [
            {"source_key": "a", "name": "田原本小学校", "address": "奈良県磯城郡田原本町新町48", "latitude": 34.56, "longitude": 135.79, "installation_location": "職員室・体育館"},
            {"source_key": "b", "name": "田原本小学校学童保育所", "address": "奈良県磯城郡田原本町新町48", "latitude": 34.56, "longitude": 135.79, "installation_location": "保育室"},
        ]
        kept, exact_removed, duplicate_pairs = mark_duplicates(rows)
        self.assertEqual(len(kept), 2)
        self.assertEqual(exact_removed, 0)
        self.assertEqual(duplicate_pairs, 0)
        self.assertTrue(all(not row.get("duplicate_candidate", False) for row in kept))

    def test_missing_installation_detail_does_not_bypass_duplicate_review(self):
        rows = [
            {"source_key": "a", "name": "市役所", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0, "installation_location": ""},
            {"source_key": "b", "name": "市役所別館", "address": "東京都千代田区1", "latitude": 35.0, "longitude": 139.0, "installation_location": "受付"},
        ]
        kept, exact_removed, duplicate_pairs = mark_duplicates(rows)
        self.assertEqual(len(kept), 2)
        self.assertEqual(exact_removed, 0)
        self.assertEqual(duplicate_pairs, 1)
        self.assertTrue(all(row.get("duplicate_candidate", False) for row in kept))


if __name__ == "__main__":
    unittest.main()
