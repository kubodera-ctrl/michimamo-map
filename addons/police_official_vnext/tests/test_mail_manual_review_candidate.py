"""R15 synthetic-only private review tests; NO real police information or DB."""
import copy
import json
import os
import stat
import sys
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tests'))
from mail_json_private_review import normalize_private_review, SOURCE_ID
from mail_period_snapshot import create_or_revise
from mail_manual_review_candidate import build_private_candidate, write_private_candidate, JST, jst_date
from mail_manual_review_template import blank_template, write_blank_private_template
from test_mail_period_snapshot import receipt

NOW = datetime(2026, 11, 1, 9, 0, 0, tzinfo=JST)


def raw_record(i=1):
    return {'message':f'SYNTHETIC PRIVATE DATA REF{i} — do not publish this body',
            'send_at':'2026-10-31 08:20', 'send_by':'架空の署', 'send_to':'架空の地域',
            'subject':f'架空メール速報番号{i}'}


def prepare(rows=None):
    src=json.dumps(rows if rows is not None else [raw_record()],ensure_ascii=False).encode()
    packet=normalize_private_review(src)
    history,_=create_or_revise(packet, receipt(packet, '2026-10-31', '2026-11-01'))
    return src,packet,history


def include(packet,row_index=0,area='港区'):
    return {'local_review_row_key':packet['records'][row_index]['local_review_row_key'],
            'decision':'include', 'headline':'【架空】登下校の安全情報',
            'summary':'【架空】警視庁の配信をもとに通学時の安全確認を呼び掛けています。',
            'category':'子どもの安全','delivered_at':'2026-10-31T08:20:00+09:00',
            'delivery_time_reviewed':True,'display_area':area,'area_reviewed':area is not None,
            'manual_confirmed':True,'privacy_confirmed':True,'correction_confirmed':True,
            'duplicate_occurrence_checked':False}


def decisions(packet, history):
    version=history['versions'][-1]
    return {'schema_version':1,'kind':'manual_police_mail_delivery_review',
            'source_id':SOURCE_ID, 'source_export_sha256':packet['source_export_sha256'],
            'window_start':history['window_start'], 'window_end_exclusive':history['window_end_exclusive'],
            'window_version':version['version'], 'window_candidate_sha256':version['candidate_sha256'],
            'reviewed_at':'2026-11-01T08:55:00+09:00',
            'source_checked_at':'2026-11-01T08:50:00+09:00',
            'privacy_checked_at':'2026-11-01T08:52:00+09:00',
            'correction_check_completed':True,
            'privacy_checklist':{
              'identifying_people_removed':True,'specific_locations_removed':True,
              'original_facts_preserved':True,'third_party_rights_checked':True,
              'official_source_current_checked':True,'editorial_attribution_checked':True},
            'records':[include(packet)]}


class ManualMailReviewPipelineTests(unittest.TestCase):
    def good(self):
        a,b,c=prepare()
        return a,b,c,decisions(b,c)

    def compile(self, source=None, packet=None, history=None, decisions_file=None):
        a,b,c,d=self.good()
        return build_private_candidate(source if source is not None else a,
            packet if packet is not None else b,history if history is not None else c,
            decisions_file if decisions_file is not None else d,now=NOW)

    def test_candidate_is_private_not_live_feed(self):
        draft,receipt_info=self.compile()
        self.assertFalse(draft['publication_enabled'])
        self.assertFalse(draft['release_authorized'])
        self.assertFalse(draft['supabase_stage_allowed'])
        self.assertFalse(draft['points_awarded'])
        self.assertEqual(receipt_info['eligible_private_card_candidates'],1)
        self.assertFalse(draft['candidate_for_existing_map_private_only']['publication_enabled'])
        self.assertNotIn('SYNTHETIC PRIVATE DATA',str(draft))
        self.assertNotIn('send_to',str(draft))
        self.assertFalse(draft['official_event_id_verified'])

    def test_r14_card_contract_has_only_expected_keys(self):
        draft,_=self.compile()
        feed=draft['candidate_for_existing_map_private_only']
        self.assertEqual(set(feed),{'schema_version','kind','source_url','policy_url','license',
            'identity_scope','publication_enabled','human_review_completed','privacy_review_completed',
            'correction_check_completed','original_export_sha256','reviewed_at','expires_at','cards'})
        self.assertEqual(set(feed['cards'][0]),{'local_card_ref','headline','summary','category',
            'delivered_at','delivery_time_reviewed','display_area','area_reviewed',
            'manual_review_status','privacy_review_status','correction_review_status'})
        self.assertRegex(feed['cards'][0]['local_card_ref'],r'^local-[0-9a-f]{24}$')
        self.assertEqual(feed['identity_scope'],'delivery_message_not_incident')

    def test_unreviewed_others_held_and_exclusions_counted(self):
        src,p,h=prepare([raw_record(1),raw_record(2),raw_record(3)])
        d=decisions(p,h)
        d['records'].append({'local_review_row_key':p['records'][1]['local_review_row_key'], 'decision':'exclude'})
        result,s=build_private_candidate(src,p,h,d,now=NOW)
        self.assertEqual((s['eligible_private_card_candidates'],s['excluded_rows'],s['unreviewed_rows_held']),(1,1,1))

    def test_duplicate_rows_are_not_automatically_deduplicated(self):
        src,p,h=prepare([raw_record(1),raw_record(1)])
        d=decisions(p,h)
        with self.assertRaisesRegex(ValueError,'Repeated'):
            build_private_candidate(src,p,h,d,now=NOW)
        d['records'][0]['duplicate_occurrence_checked']=True
        draft,_=build_private_candidate(src,p,h,d,now=NOW)
        self.assertEqual(draft['unreviewed_rows_held'],1)
        self.assertEqual(len(draft['candidate_for_existing_map_private_only']['cards']),1)

    def test_source_must_match_raw_original_exact(self):
        src,p,h,d=self.good()
        with self.assertRaisesRegex(ValueError,'ORIGINAL'):
            build_private_candidate(src+b' ',p,h,d,now=NOW)
        p['records'][0]['raw_fields_private']['message']='tampered'
        with self.assertRaisesRegex(ValueError,'ORIGINAL'):
            build_private_candidate(src,p,h,d,now=NOW)

    def test_latest_revised_window_invalidates_prior_review(self):
        src,p,h,d=self.good()
        new_raw,new_packet,_=prepare([raw_record(2)])
        newer,_=create_or_revise(new_packet,receipt(new_packet,'2026-10-31','2026-11-01'),h)
        with self.assertRaisesRegex(ValueError,'changed'):
            build_private_candidate(src,p,newer,d,now=NOW)

    def test_manually_selected_wrong_window_version_rejected(self):
        src,p,h,d=self.good()
        d['window_version']=99
        with self.assertRaisesRegex(ValueError,'exact current'):
            build_private_candidate(src,p,h,d,now=NOW)

    def test_unbound_decision_source_sha_rejected(self):
        src,p,h,d=self.good();d['source_export_sha256']='0'*64
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,d,now=NOW)

    def test_privacy_checklist_must_be_all_true(self):
        src,p,h,d=self.good()
        for key in d['privacy_checklist']:
            invalid=copy.deepcopy(d);invalid['privacy_checklist'][key]=False
            with self.subTest(key=key),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,invalid,now=NOW)

    def test_correction_and_all_row_checks_must_be_explicit(self):
        src,p,h,d=self.good()
        d['correction_check_completed']=False
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,d,now=NOW)
        for key in ('manual_confirmed','privacy_confirmed','correction_confirmed','delivery_time_reviewed'):
            test=decisions(p,h);test['records'][0][key]=False
            with self.subTest(key=key),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,test,now=NOW)

    def test_future_and_stale_reviews_rejected(self):
        src,p,h,d=self.good()
        for key,value in [('reviewed_at','2026-11-02T08:55:00+09:00'),
                          ('source_checked_at','2026-10-30T08:50:00+09:00'),
                          ('privacy_checked_at','2026-11-01T08:56:00+09:00')]:
            invalid=copy.deepcopy(d);invalid[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,invalid,now=NOW)

    def test_delivery_timestamp_reviewed_and_recent_only(self):
        src,p,h,d=self.good()
        for value in ('2026-10-31T08:20:00Z','2026-11-01T10:00:00+09:00',
                      '2026-08-01T08:20:00+09:00','2026-02-30T12:00:00+09:00'):
            invalid=copy.deepcopy(d);invalid['records'][0]['delivered_at']=value
            with self.subTest(value=value),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,invalid,now=NOW)

    def test_private_text_heuristics_block_suspicious_content(self):
        src,p,h,d=self.good()
        samples=('港区台場１丁目で不審者','東京都123区での配信',
                 '通報先:example@example.com','http://example.net 調べる',
                 '〇〇マンションの詳細','電話番号は不明です',
                 p['records'][0]['raw_fields_private']['message'])
        for sample in samples:
            invalid=copy.deepcopy(d);invalid['records'][0]['summary']=sample
            with self.subTest(sample=sample[:18]),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,invalid,now=NOW)

    def test_unverified_or_overprecise_area_rejected(self):
        src,p,h,d=self.good()
        for area in ('港区台場１丁目','江東区南砂2丁目','架空マンション','東京都某駅前'):
            invalid=copy.deepcopy(d);invalid['records'][0]['display_area']=area
            with self.subTest(area=area),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,invalid,now=NOW)
        invalid=copy.deepcopy(d);invalid['records'][0]['area_reviewed']=False
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,invalid,now=NOW)
        d['records'][0]['display_area']=None;d['records'][0]['area_reviewed']=False
        draft,_=build_private_candidate(src,p,h,d,now=NOW)
        self.assertIsNone(draft['candidate_for_existing_map_private_only']['cards'][0]['display_area'])

    def test_duplicate_or_unknown_row_reference_rejected(self):
        src,p,h=prepare([raw_record(1),raw_record(2)])
        d=decisions(p,h);d['records'].append(copy.deepcopy(d['records'][0]))
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,d,now=NOW)
        d=decisions(p,h);d['records'][0]['local_review_row_key']='not-a-real-private-key'
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,d,now=NOW)

    def test_unknown_fields_cannot_smuggle_publish_or_incident_id(self):
        src,p,h,d=self.good()
        for name in ('publication_enabled','public_url','official_event_id'):
            bad=copy.deepcopy(d);bad[name]='forged'
            with self.subTest(name=name),self.assertRaises(ValueError):
                build_private_candidate(src,p,h,bad,now=NOW)
        d['records'][0]['official_event_id']='forged'
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,d,now=NOW)

    def test_untrusted_history_publication_flag_fails(self):
        src,p,h,d=self.good();h['publication_enabled']=True
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,d,now=NOW)

    def test_empty_selection_remains_hold_nonpublication(self):
        src,p,h,d=self.good();d['records']=[]
        draft,info=build_private_candidate(src,p,h,d,now=NOW)
        self.assertEqual(info['eligible_private_card_candidates'],0)
        self.assertEqual(info['unreviewed_rows_held'],1)
        self.assertFalse(draft['candidate_for_existing_map_private_only']['publication_enabled'])

    def test_owner_only_atomic_write_and_preserves_previous_on_failure(self):
        with tempfile.TemporaryDirectory() as parent:
            directory=Path(parent)/'police_source_private';directory.mkdir(mode=0o700)
            src,p,h,d=self.good()
            files=[directory/n for n in ('original.json','packet.json','history.json','decisions.json')]
            for file,blob in zip(files,[src,json.dumps(p,ensure_ascii=False).encode(),
                json.dumps(h,ensure_ascii=False).encode(),json.dumps(d,ensure_ascii=False).encode()]):
                file.write_bytes(blob);file.chmod(0o600)
            output=directory/'private_candidate.json'
            summary=write_private_candidate(*files,output,now=NOW)
            self.assertEqual(summary['eligible_private_card_candidates'],1)
            self.assertEqual(stat.S_IMODE(output.stat().st_mode),0o600)
            body=output.read_bytes();self.assertNotIn(b'SYNTHETIC PRIVATE DATA',body)
            invalid=copy.deepcopy(d);invalid['publication_enabled']=True
            files[-1].write_bytes(json.dumps(invalid).encode());files[-1].chmod(0o600)
            with self.assertRaises(ValueError):write_private_candidate(*files,output,now=NOW)
            self.assertEqual(body,output.read_bytes())

    def test_reject_nonprivate_directory_symlink_or_readable_files(self):
        with tempfile.TemporaryDirectory() as parent:
            directory=Path(parent)/'police_source_private';directory.mkdir(mode=0o700)
            src,p,h,d=self.good()
            files=[directory/n for n in ('original.json','packet.json','history.json','decisions.json')]
            for file,blob in zip(files,[src,json.dumps(p).encode(),json.dumps(h).encode(),json.dumps(d).encode()]):
                file.write_bytes(blob);file.chmod(0o600)
            output=directory/'private_candidate.json'
            files[0].chmod(0o644)
            with self.assertRaisesRegex(ValueError,'0600'):write_private_candidate(*files,output,now=NOW)
            files[0].chmod(0o600)
            directory.chmod(0o755)
            with self.assertRaisesRegex(ValueError,'0700'):write_private_candidate(*files,output,now=NOW)
            directory.chmod(0o700)
            link=directory/'symlink.json';link.symlink_to(files[0])
            with self.assertRaises(ValueError):write_private_candidate(link,*files[1:],output,now=NOW)

    def test_blank_template_defaults_everything_to_hold(self):
        src,p,h,d=self.good()
        template=blank_template(src,p,h)
        self.assertEqual(len(template['records']),1)
        self.assertEqual(template['records'][0]['decision'],'hold')
        self.assertFalse(template['correction_check_completed'])
        self.assertTrue(all(v is False for v in template['privacy_checklist'].values()))
        self.assertEqual(template['reviewed_at'],'')
        self.assertNotIn('SYNTHETIC PRIVATE DATA',str(template))
        with self.assertRaises(ValueError):build_private_candidate(src,p,h,template,now=NOW)

    def test_template_existing_file_not_overwritten(self):
        with tempfile.TemporaryDirectory() as parent:
            directory=Path(parent)/'police_source_private';directory.mkdir(mode=0o700)
            src,p,h,d=self.good()
            files=[directory/n for n in ('original.json','packet.json','history.json')]
            for f,data in zip(files,[src,json.dumps(p).encode(),json.dumps(h).encode()]):
                f.write_bytes(data);f.chmod(0o600)
            output=directory/'template.json'
            result=write_blank_private_template(*files,output)
            self.assertEqual(result['records_held'],1)
            self.assertEqual(stat.S_IMODE(output.stat().st_mode),0o600)
            original=output.read_bytes()
            with self.assertRaisesRegex(ValueError,'overwrite'):
                write_blank_private_template(*files,output)
            self.assertEqual(original,output.read_bytes())

    def test_original_duplicate_json_fields_rejected(self):
        src,p,h,d=self.good()
        # Deliberate duplicate key; matching last value must not be enough.
        bad=b'[{' + b'"message":"A","message":"B",' +             b'"send_at":"x","send_by":"y","send_to":"z","subject":"s"}]'
        bad_packet=normalize_private_review(bad)
        with self.assertRaisesRegex(ValueError,'Duplicate key'):
            build_private_candidate(bad,bad_packet,h,d,now=NOW)

    def test_jst_parser_canonical_time_only(self):
        self.assertEqual(jst_date('2026-11-01T08:50:00+09:00').hour,8)
        for value in ('2026-11-01T08:50:00Z','2026-11-01 08:50+09:00','2026-11-01T8:50:00+09:00'):
            with self.subTest(value=value),self.assertRaises(ValueError):jst_date(value)

if __name__=='__main__':unittest.main()
