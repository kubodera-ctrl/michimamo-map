import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from aed_review_batch import staging_query

class BatchTests(unittest.TestCase):
    def test_live_or_duplicate_rows_cannot_be_staged(self):
        for active,duplicate in ((True,False),(False,True)):
            with self.assertRaises(ValueError):
                staging_query([{'source_key':'bodik-reviewed:test','active':active,'duplicate_candidate':duplicate}])
    def test_delimiter_cannot_escape_the_json_literal(self):
        with self.assertRaises(ValueError):
            staging_query([{'source_key':'bodik-reviewed:test','active':False,'duplicate_candidate':False,'name':'$aed_review_20260914$'}])

if __name__=='__main__':unittest.main()
