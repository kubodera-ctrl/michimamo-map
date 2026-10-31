"""Synthetic-only tests: no actual victim, police text, or external network."""
import copy
import json
import stat
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from mail_json_private_review import normalize_private_review
from mail_identity_reconcile import reconcile_packets,write_private_comparison


def row(suffix):
    return {'message':f'SYNTHETIC_FOR_TEST_{suffix}','send_at':'2026-10-20 12:00',
            'send_by':'架空防犯連絡','send_to':'架空市','subject':f'架空件名{suffix}'}


def packet(rows):
    return normalize_private_review(json.dumps(rows, ensure_ascii=False).encode())


class ReconcileSafetyTests(unittest.TestCase):
    def test_same_export_not_official_id_even_if_exact(self):
        r=packet([row('A'),row('B')]);o=reconcile_packets(r,r)
        self.assertEqual(o['possible_exact_text_overlap'],2)
        self.assertFalse(o['official_event_identity_verified'])
        self.assertFalse(o['correction_equivalence_verified'])
        self.assertFalse(o['publication_enabled'])
        self.assertFalse(o['supabase_stage_allowed'])
        self.assertFalse(o['source_period_verified'])
        self.assertEqual(o['current_only_text_occurrences'],0)

    def test_reordered_rows_are_text_candidates_not_issued_id(self):
        a=packet([row('A'),row('B')]);b=packet([row('B'),row('A')])
        result=reconcile_packets(a,b)
        self.assertEqual(result['possible_exact_text_overlap'],2)
        self.assertNotEqual(result['source_export_receipts']['previous_sha256'],result['source_export_receipts']['current_sha256'])
        self.assertFalse(result['automatic_deduplication'])

    def test_changed_body_never_claims_correction_or_withdrawal(self):
        a=packet([row('A')]);b=packet([{**row('A'),'message':'SYNTHETIC_CHANGED_A'}])
        r=reconcile_packets(a,b)
        self.assertEqual((r['possible_exact_text_overlap'],r['previous_only_text_occurrences'],r['current_only_text_occurrences']),(0,1,1))
        self.assertFalse(r['missing_means_withdrawn'])
        self.assertFalse(r['new_text_means_new_incident'])

    def test_duplicate_identical_messages_not_silently_merged(self):
        a=packet([row('A'),row('A')]);b=packet([row('A')])
        result=reconcile_packets(a,b)
        self.assertEqual(result['previous_rows'],2)
        self.assertEqual(result['current_rows'],1)
        self.assertEqual(result['possible_exact_text_overlap'],1)
        self.assertEqual(result['previous_only_text_occurrences'],1)
        self.assertEqual(result['repeated_payload_groups_needing_review'],1)
        self.assertEqual(len(result['groups_private_only'][0]['previous_local_row_keys']),2)

    def test_tampered_content_sha_fails(self):
        a=packet([row('A')]);b=copy.deepcopy(a)
        b['records'][0]['raw_fields_private']['message']='TAMPER'
        with self.assertRaisesRegex(ValueError,'digest'):
            reconcile_packets(a,b)

    def test_cannot_flip_any_review_or_publication_flag(self):
        a=packet([row('A')]);b=copy.deepcopy(a)
        for key,value in [('publication_enabled',True),('supabase_stage_allowed',True),
                          ('official_identity_verified',True),('points_awarded',True)]:
            t=copy.deepcopy(b);t[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):reconcile_packets(a,t)
        t=copy.deepcopy(b);t['records'][0]['official_record_id']='invented'
        with self.assertRaises(ValueError):reconcile_packets(a,t)

    def test_content_hashes_private_only_no_raw_text_in_summary(self):
        o=reconcile_packets(packet([row('SECRET_A')]),packet([row('SECRET_B')]))
        self.assertNotIn('SECRET_',str(o))
        self.assertEqual(o['source_id'],'tokyo_mail_keishicho_opendata')

    def test_write_private_atomic_and_disallow_public_path(self):
        with tempfile.TemporaryDirectory() as base:
            p=Path(base)/'police_private';p.mkdir(mode=0o700)
            old=p/'before.json';new=p/'after.json';out=p/'compare.json'
            old.write_text(json.dumps(packet([row('A')]),ensure_ascii=False),encoding='utf-8')
            new.write_text(json.dumps(packet([row('A'),row('B')]),ensure_ascii=False),encoding='utf-8')
            summary=write_private_comparison(old,new,out)
            self.assertEqual(summary['possible_exact_text_overlap'],1)
            self.assertFalse(summary['publication_enabled'])
            self.assertNotIn('SYNTHETIC_FOR_TEST',str(summary))
            self.assertEqual(stat.S_IMODE(out.stat().st_mode),0o600)
            assert 'SYNTHETIC_FOR_TEST' not in out.read_text()
            before=out.read_bytes();new.write_text('{broken json')
            with self.assertRaises(ValueError):write_private_comparison(old,new,out)
            self.assertEqual(out.read_bytes(),before)
            with self.assertRaises(ValueError):write_private_comparison(old,new,Path(base)/'export.json')

    def test_reject_symlink_and_world_readable_dir(self):
        with tempfile.TemporaryDirectory() as base:
            p=Path(base)/'police_private';p.mkdir(mode=0o700)
            a=p/'a.json';b=p/'b.json';z=p/'z.json';a.write_text(json.dumps(packet([row('A')])));b.write_text(json.dumps(packet([row('B')])))
            p.chmod(0o755)
            with self.assertRaisesRegex(ValueError,'0700'):write_private_comparison(a,b,z)
            p.chmod(0o700);link=p/'link.json';link.symlink_to(a)
            with self.assertRaises(ValueError):write_private_comparison(link,b,z)

if __name__=='__main__': unittest.main()
