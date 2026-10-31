from __future__ import annotations
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ingest import SOURCE_ID, normalize, merge, load_input, digest
from integrate_preview import build, EXPECTED

FIELDS = {k:k for k in ['source_record_id','title','summary','area_label','event_type','published_at',
    'occurred_at','recognized_at','revision','source_status','correction_of','location_precision','latitude',
    'longitude','location_source']}
ROW = dict(source_record_id='demo-001',title='【架空データ】声かけ',summary='これは単体テスト用の架空記述です。',
    area_label='東京都某区',event_type='声かけ等',published_at='2026-10-20T12:00:00+09:00',
    occurred_at='2026-10-19T18:30:00+09:00',recognized_at='',revision='1',
    source_status='active',correction_of='',location_precision='municipality',latitude='',longitude='',location_source='')

class IngestTests(unittest.TestCase):
    def setUp(self):
        self.now='2026-10-31T00:00:00+00:00'
    def row(self, **updates):
        return normalize({**ROW, **updates}, FIELDS, fixture=True)
    def test_source_is_separate_and_review_pending(self):
        r=self.row()
        self.assertEqual(r['source_id'],SOURCE_ID)
        self.assertNotIn(r['source_id'], ['spots','official','local_anomaly','police_safety'])
        self.assertEqual(r['review_status'],'pending')
        self.assertEqual(r['rights_status'],'unverified')
        self.assertTrue(r['is_fixture'])
        self.assertIsNone(r['latitude'])
    def test_repeat_import_idempotency(self):
        a=self.row(); first, s1=merge({}, [a], self.now)
        second, s2=merge(first, [self.row()], self.now)
        self.assertEqual(s1['new'],1)
        self.assertEqual(s2['duplicate'],1)
        self.assertEqual(len(first['records']),len(second['records']))
        self.assertEqual(second['records'][0]['history'],[])
    def test_correction_requires_review_and_keeps_history(self):
        first,_=merge({},[self.row()],self.now)
        first['records'][0]['review_status']='approved' # Simulates review evidence; importer does not approve.
        corrected=self.row(summary='【架空データ】訂正文',revision='2',source_status='corrected')
        updated,stats=merge(first,[corrected],self.now)
        self.assertEqual(stats['updated'],1)
        r=updated['records'][0]
        self.assertEqual(r['review_status'],'pending')
        self.assertEqual(r['source_status'],'corrected')
        self.assertEqual(r['history'][0]['previous_review_status'],'approved')
        self.assertNotEqual(r['history'][0]['content_hash'],r['content_hash'])
    def test_withdrawal_hides_previous_version(self):
        first,_=merge({},[self.row()],self.now)
        withdrawal=self.row(revision='2',source_status='withdrawn')
        out,stats=merge(first,[withdrawal],self.now)
        self.assertEqual(stats['withdrawn'],1)
        self.assertEqual(out['records'][0]['review_status'],'pending')
    def test_stale_does_not_override_correction(self):
        corrected=self.row(revision='3',summary='訂正文')
        old,_=merge({},[corrected],self.now)
        fresh,stats=merge(old,[self.row()],self.now)
        self.assertEqual(stats['stale'],1)
        self.assertEqual(fresh['records'][0]['revision'],3)
    def test_conflicting_same_version_fails_closed(self):
        base,_=merge({},[self.row()],self.now)
        with self.assertRaisesRegex(ValueError,'manual reconciliation'):
            merge(base,[self.row(summary='別の内容')],self.now)
    def test_geocoded_municipality_coordinates_never_accepted(self):
        r=self.row(latitude='35.6800',longitude='139.7600',location_source='geocoder_centroid',location_precision='municipality')
        self.assertIsNone(r['latitude']);self.assertIsNone(r['longitude'])
        r2=self.row(latitude='35.6800',longitude='139.7600',location_source='geocoder_centroid',location_precision='exact')
        self.assertIsNone(r2['latitude'])
        r3=self.row(latitude='35.6800',longitude='139.7600',location_source='police_explicit_coordinates',location_precision='exact')
        self.assertEqual(r3['latitude'],35.68)
    def test_missing_id_quarantines_via_pending_identity(self):
        r=self.row(source_record_id='')
        self.assertEqual(r['review_status'],'pending_identity')
        self.assertFalse(r['identity_verified'])
    def test_no_synthetic_dates_and_explicit_timezone(self):
        with self.assertRaisesRegex(ValueError,'timezone must be explicit'):
            self.row(published_at='2026-10-20T12:00:00')
        with self.assertRaisesRegex(ValueError,'empty required'):
            self.row(published_at='')
    def test_unknown_input_and_source_state_stops(self):
        with self.assertRaises(ValueError):self.row(source_status='alleged')
        with self.assertRaises(ValueError):self.row(latitude='91.1',longitude='139',location_precision='exact',location_source='police_explicit_coordinates')
    def test_script_file_input_output_replay_and_atomic_failure(self):
        with tempfile.TemporaryDirectory() as t:
            d=Path(t); inp=d/'official.csv'; mapping=d/'mapping.json'; snapshot=d/'snapshot.json'; report=d/'receipt.json'
            import csv
            with inp.open('w',encoding='utf-8',newline='') as f:
                w=csv.DictWriter(f,fieldnames=list(ROW));w.writeheader();w.writerow(ROW)
            mapping.write_text(json.dumps(FIELDS),encoding='utf-8')
            cmd=[sys.executable,str(ROOT/'ingest.py'),'--input',str(inp),'--mapping',str(mapping),'--snapshot',str(snapshot),'--report',str(report),'--fixture']
            r=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            self.assertEqual(r.returncode,0,r.stderr)
            hash0=hashlib.sha256(snapshot.read_bytes()).hexdigest()
            s=json.loads(snapshot.read_text());self.assertEqual(len(s['records']),1)
            self.assertEqual(s['statistics']['pending_review'],1)
            self.assertEqual(subprocess.run(cmd,capture_output=True).returncode,0)
            # Duplicate replay did not create an additional item.
            self.assertEqual(len(json.loads(snapshot.read_text())['records']),1)
            hash_good=hashlib.sha256(snapshot.read_bytes()).hexdigest()
            # Column changed unexpectedly: hold previous validated snapshot unchanged.
            inp.write_text('no_required_column\nvalue\n',encoding='utf-8')
            r=subprocess.run(cmd,capture_output=True,text=True)
            self.assertEqual(r.returncode,2)
            self.assertEqual(hash_good,hashlib.sha256(snapshot.read_bytes()).hexdigest())
            self.assertEqual(json.loads(report.read_text())['status'],'failed_old_snapshot_preserved')
    def test_existing_candidate_overlay_is_exact_and_gated(self):
        p=Path('/mnt/data/MAP-R3-ASP17-CANDIDATE-142-READY-FOR-APPROVAL-20261030.zip')
        if not p.exists(): self.skipTest('baseline archived outside this run')
        data=p.read_bytes();self.assertEqual(hashlib.sha256(data).hexdigest(),EXPECTED)
        patched,manifest=build(data,ROOT)
        self.assertEqual(manifest['unchanged_files'],141)
        self.assertEqual(manifest['file_count'],146)
        import io,zipfile
        with zipfile.ZipFile(io.BytesIO(patched)) as z:
            self.assertIsNone(z.testzip())
            x=z.read('test_only_not_for_upload/index.html').decode()
            self.assertIn('MACHIMAMO_POLICE_OFFICIAL_VNEXT_ENABLED===true',x)
            self.assertIn('sourceOnly:true',x)
            self.assertIn('mountOfficialSourceLinks',x)
            self.assertFalse(manifest['real_police_rows_published'])
            self.assertIn('MachimamoPoliceOfficial.createController',x)
            self.assertIn('id="filterWrapper"',x)
            with zipfile.ZipFile(io.BytesIO(data)) as base:
                for name in base.namelist():
                    if name!='index.html': self.assertEqual(z.read('test_only_not_for_upload/'+name),base.read(name))

if __name__=='__main__': unittest.main()
