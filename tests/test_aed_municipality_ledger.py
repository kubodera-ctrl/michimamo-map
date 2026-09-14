import collections
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('ledger', Path(__file__).resolve().parents[1] / 'scripts/build_aed_municipality_ledger.py')
ledger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ledger)

class MunicipalityAuditTest(unittest.TestCase):
    def test_official_prefecture_totals(self):
        # 全国町村会 2026-04-01; Tokyo includes its 23 special wards.
        expected = [179,40,33,35,25,35,59,44,25,35,63,54,62,33,30,15,19,17,27,77,42,35,54,29,19,26,43,41,39,30,19,19,27,23,19,24,17,20,34,60,20,21,45,18,26,43,41]
        master = ledger.master()
        counts = collections.Counter(m['code'][:2] for m in master)
        self.assertEqual([counts[f'{i:02}'] for i in range(1,48)], expected)
        self.assertEqual(sum(expected),1741)
        self.assertEqual({m['code']:m['local_government_code'] for m in master}['09201'],'092011')
        self.assertEqual({m['code']:m['local_government_code'] for m in master}['04216'],'042161')

    def test_ambiguous_names_and_prefixes(self):
        master=ledger.master()
        for pref,text,code in [('三重県','四日市市諏訪町','24202'),('奈良県','大和郡山市北郡山町','29203'),('東京都','府中市','13206'),('広島県','府中市','34208'),('愛媛県','伊予郡砥部町','38402'),('岐阜県','岐阜県多治見市','21204'),('北海道','泊村','01403'),('神奈川県','相模原市南区','14150'),('栃木県','東浦町4-12',None)]:
            with self.subTest(text=text,pref=pref):
                self.assertEqual(ledger.match(pref,text,master),code)

    def test_snapshot_conservation(self):
        groups=ledger.read('published_groups.json')
        mapping=ledger.read('reconciliation.json')
        rows=ledger.read('ledger.json')
        self.assertEqual(sum(g['n'] for g in groups),34561)
        self.assertEqual(sum(m['n'] for m in mapping),34561)
        self.assertEqual(sum(r['public_aed_count'] for r in rows),34561)
        self.assertEqual(sum(r['public_aed_count']>0 for r in rows),361)
        self.assertEqual(ledger.read('unresolved.json'),[])

if __name__=='__main__':
    unittest.main()
