from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class AedSubmissionFeatureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text()
        cls.migration = (ROOT / "supabase/migrations/20260916_aed_foundation_and_photo_submissions.sql").read_text()

    def test_form_requires_photo_gps_license_and_privacy(self):
        for marker in (
            'value="aed"', "captureAedGps", "normalizeAedPhoto", "aedPhotoLicense",
            "aedPrivacyConfirmed", "gps_accuracy_m", "photo_sha256",
        ):
            self.assertIn(marker, self.html)

    def test_nearby_candidates_are_shown_before_submission(self):
        self.assertIn("get_nearby_aed_candidates", self.html)
        self.assertIn("500m以内", self.html)
        self.assertIn("existing_confirmation", self.html)

    def test_reward_has_independent_uniqueness_guards(self):
        self.assertIn("submission_id uuid primary key", self.migration)
        self.assertIn("safety_spot_id bigint not null unique", self.migration)
        self.assertIn("point_transaction_id bigint not null unique", self.migration)
        self.assertIn("'aed_new_approval'", self.migration)
        self.assertIn("points integer not null default 30 check (points = 30)", self.migration)

    def test_existing_aed_review_does_not_award_points(self):
        start = self.migration.index("elsif p_decision = 'approved_existing'")
        end = self.migration.index("update public.aed_submissions", start)
        self.assertNotIn("apply_point_transaction", self.migration[start:end])
        self.assertIn("existence_confirmed", self.migration[start:end])

    def test_private_photo_bucket_and_owner_folder_policy(self):
        self.assertIn("'aed-submission-images', 'aed-submission-images', false", self.migration)
        self.assertIn("(storage.foldername(name))[1] = auth.uid()::text", self.migration)


if __name__ == "__main__":
    unittest.main()
