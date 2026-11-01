"""Synthetic one-day official mail *message* metadata only. No real incidents."""
import copy
import json
import stat
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT/'tests'))
from mail_simple_digest import build_official_digest, write_private_digest, JST, CATEGORIES
from mail_json_private_review import normalize_private_review
from test_mail_period_snapshot import receipt

DAY = datetime(2026, 10, 20, 19, 0, 0, tzinfo=JST)
SENTINEL = 'PRIVATE_PERSONAL_STREET_1-2-3_CANARY'


def data(subjects=None):
    records = []
    for subject in subjects or ['子供への注意喚起', '詐欺の注意情報', '訂正:子供への注意喚起']:
        records.append({'message':SENTINEL, 'send_at':'2026-10-20 08:20',
                        'send_by':'架空警察署', 'send_to':'秘密の配信先', 'subject':subject})
    raw = json.dumps(records, ensure_ascii=False).encode('utf-8-sig')
    return raw, receipt(normalize_private_review(raw), '2026-10-20', '2026-10-21')


class R16SimpleOfficialDigestTest(unittest.TestCase):
    def test_only_aggregate_no_source_strings_or_case_identity(self):
        raw, evidence = data()
        candidate=build_official_digest(raw, evidence, checked_at=DAY)
        self.assertEqual(candidate['total_deliveries'],3)
        self.assertEqual(sum(g['deliveries'] for g in candidate['topic_groups']),3)
        self.assertEqual(candidate['topic_groups'][-1]['topic'],'訂正・取消等の配信')
        self.assertFalse(candidate['publication_enabled'])
        self.assertFalse(candidate['official_event_id_present'])
        self.assertFalse(candidate['raw_subjects_or_bodies_included'])
        self.assertFalse(candidate['database_changed'])
        self.assertEqual(candidate['identity_scope'],'delivered_messages_not_incidents')
        self.assertNotIn(SENTINEL, str(candidate))
        self.assertNotIn('秘密', str(candidate))
        self.assertNotIn('子供への注意喚起', str(candidate))
        self.assertNotIn('send_to', str(candidate))

    def test_same_message_twice_does_not_deduplicate_incidents(self):
        raw,evidence = data(['詐欺の注意','詐欺の注意'])
        c=build_official_digest(raw,evidence,checked_at=DAY)
        self.assertEqual(c['total_deliveries'],2)
        self.assertEqual(c['topic_groups'][0]['deliveries'],2)
        self.assertFalse(c['independent_case_deduplication'])

    def test_only_authoritative_five_columns_accepted(self):
        raw,evidence = data()
        altered = json.loads(raw.decode('utf-8-sig'))
        altered[0]['event_id']='invented'
        with self.assertRaises(ValueError):
            build_official_digest(json.dumps(altered).encode(),evidence,checked_at=DAY)
        repeated_key=b'[{' + b'"message":"a","message":"b",' + b'"send_at":"x","send_by":"y","send_to":"z","subject":"s"}]'
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            build_official_digest(repeated_key,evidence,checked_at=DAY)

    def test_source_sha_and_day_attestation_fail_closed(self):
        raw,evidence=data()
        altered=copy.deepcopy(evidence);altered['schema']['sha256']='f'*64
        with self.assertRaises(ValueError):build_official_digest(raw,altered,checked_at=DAY)
        altered=copy.deepcopy(evidence);altered['post']['sent_count']=2
        with self.assertRaises(ValueError):build_official_digest(raw,altered,checked_at=DAY)
        altered=copy.deepcopy(evidence);altered['publication_enabled']=True
        with self.assertRaises(ValueError):build_official_digest(raw,altered,checked_at=DAY)

    def test_old_source_and_future_sources_not_presented_as_live(self):
        raw,evidence=data()
        with self.assertRaisesRegex(ValueError,'current enough'):
            build_official_digest(raw,evidence,checked_at=DAY+timedelta(days=3))
        with self.assertRaisesRegex(ValueError,'current enough'):
            build_official_digest(raw,evidence,checked_at=DAY-timedelta(days=1))

    def test_unknown_subject_falls_back_to_neutral_topic(self):
        raw,evidence=data(['個人名と住所が載った架空の題名 '+SENTINEL])
        c=build_official_digest(raw,evidence,checked_at=DAY)
        self.assertEqual(c['topic_groups'][0]['topic'],'その他の配信')
        self.assertNotIn(SENTINEL,str(c))
        self.assertLessEqual(len(CATEGORIES),7)

    def test_invalid_json_never_imported(self):
        raw,evidence=data()
        for broken in (b'',b'\xff',b'{broken'):
            with self.subTest(broken=broken),self.assertRaises(ValueError):
                build_official_digest(broken,evidence,checked_at=DAY)

    def test_owner_only_write_atomic_and_no_source_logged(self):
        raw,evidence=data()
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp)/'mail_source_private';directory.mkdir(mode=0o700)
            source=directory/'source.json';rec=directory/'receipt.json';dest=directory/'candidate.json'
            source.write_bytes(raw);rec.write_text(json.dumps(evidence),encoding='utf-8')
            source.chmod(0o600);rec.chmod(0o600)
            summary=write_private_digest(source,rec,dest,now=DAY)
            self.assertFalse(summary['publication_enabled'])
            self.assertEqual(stat.S_IMODE(dest.stat().st_mode),0o600)
            self.assertNotIn(SENTINEL,dest.read_text())
            self.assertNotIn(SENTINEL,str(summary))
            before=dest.read_bytes()
            rec.write_text('{broken');rec.chmod(0o600)
            with self.assertRaises(ValueError):write_private_digest(source,rec,dest,now=DAY)
            self.assertEqual(dest.read_bytes(),before)

    def test_private_permissions_and_public_paths_rejected(self):
        raw,evidence=data()
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp)/'mail_source_private';directory.mkdir(mode=0o700)
            source=directory/'source.json';rec=directory/'receipt.json';dest=directory/'candidate.json'
            source.write_bytes(raw);rec.write_text(json.dumps(evidence));source.chmod(0o644);rec.chmod(0o600)
            with self.assertRaisesRegex(ValueError,'0600'):write_private_digest(source,rec,dest,now=DAY)
            source.chmod(0o600);directory.chmod(0o755)
            with self.assertRaisesRegex(ValueError,'0700'):write_private_digest(source,rec,dest,now=DAY)
            directory.chmod(0o700)
            with self.assertRaises(ValueError):write_private_digest(source,rec,Path(tmp)/'public.json',now=DAY)

if __name__=='__main__': unittest.main()
