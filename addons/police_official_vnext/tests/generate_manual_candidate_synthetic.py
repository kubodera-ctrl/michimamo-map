"""Emit a synthetic-only R15 private candidate for the R14 JS contract test."""
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
sys.path.insert(0,str(ROOT/'tests'))
from mail_manual_review_candidate import build_private_candidate, JST
from test_mail_manual_review_candidate import prepare,decisions

if __name__=='__main__':
    if len(sys.argv)!=2 or not Path(sys.argv[1]).is_absolute():
        raise SystemExit('Exact absolute temporary output path required')
    a,b,c=prepare()
    draft,_=build_private_candidate(a,b,c,decisions(b,c),now=datetime(2026,11,1,9,0,tzinfo=JST))
    Path(sys.argv[1]).write_text(json.dumps(draft,ensure_ascii=False),encoding='utf-8')
    print('R15_SYNTHETIC_PRIVATE_CANDIDATE_CREATED_NO_REAL_MESSAGES')
