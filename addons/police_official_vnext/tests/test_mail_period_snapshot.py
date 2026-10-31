"""All inputs are wholly synthetic and never contact the actual police system."""
import copy
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from mail_json_private_review import normalize_private_review, FIELDS, SOURCE_URL
from mail_period_snapshot import create_or_revise, verified_window_receipt, write_private_window


def packet(text='SYNTHETIC-ONLY',day='2026-10-20',repeat=False):
    item={'message':text, 'send_at':day+' 12:20', 'send_by':'架空警察署',
          'send_to':'架空市', 'subject':'【架空】安全情報'}
    rows=[item,item] if repeat else [item]
    return normalize_private_review(json.dumps(rows,ensure_ascii=False).encode('utf-8'))


def receipt(p,day='2026-10-20',end='2026-10-21'):
    return {
      'status':'OFFICIAL_MAIL_MINIMAL_UI_EXPORT_SCHEMA_ONLY',
      'official_form':SOURCE_URL,'selected_format':'json','export_day':day,
      'date_to_exclusive':end,
      'schema':{
        'bytes':500,'columns':sorted(FIELDS),
        'correction_and_withdrawal_contract_verified':False,
        'dataset_rights_verified':False,'encoding':'utf-8-sig',
        'format':'json','importable_to_live_db':False,
        'inspection':'SCHEMA_ONLY_NOT_AUTHENTICATED','publishable':False,
        'records':len(p['records']),'requires_manual_mapping':True,
        'sha256':p['source_export_sha256'],
        'source_claim':'NOT_PROVEN_BY_FILE_CONTENTS',
        'stable_official_record_id_verified':False,
      },
      'post':{'only_public_day_range':True,'sent_count':1,'blocked_count':0},
      'raw_csv_persisted':False,'raw_rows_logged':False,
      'db_changed':False,'publication_enabled':False,
      'stable_source_id_semantics_confirmed':False,
      'correction_and_withdrawal_semantics_confirmed':False,
    }


class SnapshotWindowTests(unittest.TestCase):
    def test_receipt_checks_not_authenticity(self):
        p=packet();r=receipt(p);m=verified_window_receipt(r,p)
        self.assertEqual(m['row_count'],1)
        state,result=create_or_revise(p,r)
        self.assertFalse(state['source_period_verified'])
        self.assertFalse(state['publication_enabled'])
        self.assertFalse(state['supabase_stage_allowed'])
        self.assertEqual(state['versions'][0]['snapshot_identity_type'],
                         'delivered_message_export_window_not_incident')
        self.assertNotIn('SYNTHETIC-ONLY',str(state))
        self.assertTrue(result['changed'])

    def test_exact_file_replay_does_not_revise(self):
        p=packet();r=receipt(p);state,_=create_or_revise(p,r)
        after,result=create_or_revise(p,r,state)
        self.assertEqual(state,after)
        self.assertFalse(result['changed']);self.assertEqual(len(after['versions']),1)

    def test_new_file_same_one_day_replaces_only_candidate(self):
        p=packet('SYNTH-A');r=receipt(p);state,_=create_or_revise(p,r)
        n=packet('SYNTH-B');updated,res=create_or_revise(n,receipt(n),state)
        self.assertEqual(res['local_versions'],2)
        self.assertEqual([v['state'] for v in updated['versions']],
                         ['superseded_review_history','pending_manual_review'])
        self.assertFalse(updated['versions'][1]['automatic_correction_or_withdrawal'])
        self.assertFalse(updated['versions'][1]['publishable'])
        self.assertFalse(updated['official_event_identity_verified'])
        self.assertEqual(state['versions'][0]['state'],'pending_manual_review')

    def test_older_file_cannot_reappear_as_incident_revision(self):
        a=packet('SYNTH-A');b=packet('SYNTH-B')
        v,_=create_or_revise(a,receipt(a));v,_=create_or_revise(b,receipt(b),v)
        with self.assertRaisesRegex(ValueError,'reappearance'):
            create_or_revise(a,receipt(a),v)

    def test_different_window_never_merged(self):
        p=packet();a,_=create_or_revise(p,receipt(p))
        b=packet('SYNTH-B',day='2026-10-21')
        with self.assertRaisesRegex(ValueError,'Separate export window'):
            create_or_revise(b,receipt(b,'2026-10-21','2026-10-22'),a)

    def test_multi_day_disallowed(self):
        p=packet()
        with self.assertRaisesRegex(ValueError,'One-day'):
            create_or_revise(p,receipt(p,end='2026-10-24'))

    def test_wrong_source_sha_count_format_or_headers_fails(self):
        p=packet()
        for mutator in [lambda r:r['schema'].update(sha256='0'*64),
                        lambda r:r['schema'].update(records=100),
                        lambda r:r['schema'].update(format='csv'),
                        lambda r:r['schema'].update(columns=['message']),
                        lambda r:r.update(official_form='https://example.org/')]:
            with self.subTest(mutator=mutator),self.assertRaises(ValueError):
                r=receipt(p);mutator(r);create_or_revise(p,r)

    def test_never_reuse_unverified_rights_as_approval(self):
        p=packet()
        for key in ('publishable','dataset_rights_verified','stable_official_record_id_verified'):
            r=receipt(p);r['schema'][key]=True
            with self.subTest(key=key),self.assertRaises(ValueError):create_or_revise(p,r)
        r=receipt(p);r['publication_enabled']=True
        with self.assertRaises(ValueError):create_or_revise(p,r)

    def test_request_count_broad_range_or_change_not_approved(self):
        p=packet()
        for change in [('sent_count',2),('blocked_count',1),('only_public_day_range',False)]:
            r=receipt(p);r['post'][change[0]]=change[1]
            with self.subTest(change=change),self.assertRaises(ValueError):create_or_revise(p,r)

    def test_multiple_identical_messages_are_not_merged(self):
        p=packet(repeat=True);state,_=create_or_revise(p,receipt(p))
        self.assertEqual(state['versions'][0]['row_count'],2)
        self.assertEqual(state['versions'][0]['repeated_payload_occurrences'],1)
        self.assertFalse(state['versions'][0]['publishable'])

    def test_source_review_packet_not_trusted_when_tampered(self):
        p=packet();p['records'][0]['raw_fields_private']['message']='TAMPER'
        with self.assertRaisesRegex(ValueError,'digest'):
            create_or_revise(p,receipt(p))

    def test_forged_history_release_or_hash_rejected(self):
        p=packet();state,_=create_or_revise(p,receipt(p))
        for change in [('publication_enabled',True),('supabase_stage_allowed',True),
                       ('source_period_verified',True)]:
            s=copy.deepcopy(state);s[change[0]]=change[1]
            with self.subTest(key=change[0]),self.assertRaises(ValueError):
                create_or_revise(packet('B'),receipt(packet('B')),s)
        s=copy.deepcopy(state);s['versions'][0]['row_count']=999
        with self.assertRaises(ValueError):create_or_revise(packet('B'),receipt(packet('B')),s)

    def test_owner_private_atomic_and_failure_preserves_bytes(self):
        with tempfile.TemporaryDirectory() as parent:
            d=Path(parent)/'source_private';d.mkdir(mode=0o700)
            p=d/'private.json';r=d/'receipt.json';o=d/'history.json'
            packet_a=packet('SYNTH-A');p.write_text(json.dumps(packet_a),encoding='utf8')
            r.write_text(json.dumps(receipt(packet_a)),encoding='utf8')
            result=write_private_window(p,r,o)
            self.assertTrue(result['changed']);self.assertEqual(stat.S_IMODE(o.stat().st_mode),0o600)
            first=o.read_bytes()
            self.assertNotIn(b'SYNTH-A',first)
            replay=write_private_window(p,r,o)
            self.assertFalse(replay['changed']);self.assertEqual(first,o.read_bytes())
            packet_b=packet('SYNTH-B');p.write_text(json.dumps(packet_b),encoding='utf8')
            r.write_text(json.dumps(receipt(packet_b)),encoding='utf8')
            revised=write_private_window(p,r,o)
            self.assertTrue(revised['changed']);self.assertEqual(revised['local_versions'],2)
            history=o.read_bytes();r.write_text('{bad json',encoding='utf8')
            with self.assertRaises(ValueError):write_private_window(p,r,o)
            self.assertEqual(history,o.read_bytes())

    def test_symlink_and_permissions_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            d=Path(root)/'source_private';d.mkdir(mode=0o700)
            p=d/'packet.json';r=d/'receipt.json';o=d/'out.json'
            v=packet();p.write_text(json.dumps(v));r.write_text(json.dumps(receipt(v)))
            d.chmod(0o755)
            with self.assertRaisesRegex(ValueError,'0700'):write_private_window(p,r,o)
            d.chmod(0o700);link=d/'link.json';link.symlink_to(p)
            with self.assertRaisesRegex(ValueError,'symlink'):
                write_private_window(link,r,o)
            with self.assertRaises(ValueError):write_private_window(p,r,Path(root)/'public.json')

    def test_private_receipt_forged_older_rejects(self):
        p=packet('a');q=packet('b')
        st,_=create_or_revise(p,receipt(p));st,_=create_or_revise(q,receipt(q),st)
        st['versions'][0]['state']='pending_manual_review'
        with self.assertRaises(ValueError):create_or_revise(packet('c'),receipt(packet('c')),st)


if __name__=='__main__': unittest.main()
