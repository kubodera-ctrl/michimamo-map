"""Synthetic rows only; do not put actual police incident data in tests."""
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from mail_json_private_review import normalize_private_review, write_private_review

ROW = {"message":"PRIVATE_SYNTHETIC_VICTIM_TEXT", "send_at":"2026-10-20 13:21",
       "send_by":"架空の発信元", "send_to":"架空地域", "subject":"【架空】模擬のお知らせ"}


class MailJsonPrivateReviewTests(unittest.TestCase):
    def doc(self, value=None):
        return json.dumps([value or ROW], ensure_ascii=False).encode('utf-8')

    def test_list_five_fields_only_and_no_public_release(self):
        packet = normalize_private_review(self.doc())
        self.assertEqual(len(packet['records']), 1)
        self.assertFalse(packet['publication_enabled'])
        self.assertFalse(packet['supabase_stage_allowed'])
        self.assertFalse(packet['points_awarded'])
        self.assertEqual(packet['records'][0]['review_status'], 'pending_identity')
        self.assertIsNone(packet['records'][0]['official_record_id'])
        self.assertIsNone(packet['records'][0]['latitude'])
        self.assertIsNone(packet['records'][0]['published_at'])
        self.assertEqual(packet['records'][0]['raw_fields_private']['message'], ROW['message'])

    def test_official_export_object_wrapper_supported_but_not_new_keys(self):
        wrapped = json.dumps({"records": [ROW], "total": 1}, ensure_ascii=False).encode('utf-8')
        self.assertEqual(len(normalize_private_review(wrapped)['records']), 1)
        with self.assertRaises(ValueError):
            normalize_private_review(json.dumps({"rows": [ROW]}).encode('utf-8'))
        with self.assertRaises(ValueError):
            normalize_private_review(json.dumps({"records": [ROW], "total": 2}, ensure_ascii=False).encode())

    def test_unknown_export_schema_is_fail_closed(self):
        with self.assertRaises(ValueError):
            normalize_private_review(self.doc({**ROW, "event_id":"invented"}))
        with self.assertRaises(ValueError):
            normalize_private_review(self.doc({"send_at":"2026-10-20"}))
        with self.assertRaises(ValueError):
            normalize_private_review(self.doc({**ROW, "message":["bad"]}))
        with self.assertRaises(ValueError):
            normalize_private_review(b'\xff')

    def test_different_row_positions_not_issued_police_ids(self):
        raw = json.dumps([ROW, ROW], ensure_ascii=False).encode()
        packet = normalize_private_review(raw)
        a, b = packet['records']
        self.assertNotEqual(a['local_review_row_key'], b['local_review_row_key'])
        self.assertEqual(packet['duplicate_payload_occurrences'], 1)
        self.assertFalse(a['official_id_verified'])

    def test_write_atomic_private_and_never_log_body(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'verified_source_private'
            p.mkdir(mode=0o700)
            source = p / 'sample.json'
            dest = p / 'review.json'
            source.write_bytes(self.doc())
            result = write_private_review(source, dest)
            self.assertTrue(dest.exists())
            self.assertEqual(stat.S_IMODE(dest.stat().st_mode), 0o600)
            self.assertNotIn(ROW['message'], json.dumps(result, ensure_ascii=False))
            self.assertNotIn(ROW['subject'], json.dumps(result, ensure_ascii=False))
            self.assertEqual(result['count'], 1)
            self.assertFalse(result['publication_enabled'])
            before = dest.read_bytes()
            source.write_bytes(b'invalid-json')
            with self.assertRaises(ValueError):
                write_private_review(source, dest)
            self.assertEqual(dest.read_bytes(), before)

    def test_private_directory_permissions_are_required(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / 'mail_private'
            p.mkdir(mode=0o755)
            source = p / 'mail.json'
            source.write_bytes(self.doc())
            with self.assertRaisesRegex(ValueError, 'mode 0700'):
                write_private_review(source, p / 'review.json')

    def test_disallow_public_output_and_symlink(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder)
            source = p / 'mail.json'
            source.write_bytes(self.doc())
            with self.assertRaises(ValueError):
                write_private_review(source, p / 'review.json')
            private = p / 'mail_private'
            private.mkdir()
            link = private / 'link.json'
            link.symlink_to(source)
            with self.assertRaises(ValueError):
                write_private_review(link, private / 'output.json')
            source2 = private / 'mail.json'
            source2.write_bytes(self.doc())
            with self.assertRaises(ValueError):
                write_private_review(source2, p / 'review.json')

if __name__ == '__main__':
    unittest.main()
