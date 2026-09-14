"""Conservatively exclude reviewed rows already represented in a production snapshot."""
import argparse
from collections import Counter
import json
from pathlib import Path
from import_nationwide_aed import compact, haversine_m


def reconcile(rows, existing):
    exact={(compact(r['name']),compact(r['address'])) for r in existing}
    buckets={}
    for r in existing:
        buckets.setdefault((round(r['latitude']*100),round(r['longitude']*100)),[]).append(r)
    accepted=[]; rejected=Counter()
    for row in rows:
        if row.get('duplicate_candidate'):
            rejected['internal_near_duplicate']+=1;continue
        if (compact(row['name']),compact(row['address'])) in exact:
            rejected['existing_name_address']+=1;continue
        x,y=round(row['latitude']*100),round(row['longitude']*100)
        near=[r for i in range(x-1,x+2) for j in range(y-1,y+2) for r in buckets.get((i,j),[])]
        a=compact(row['name'])
        matched=False
        for other in near:
            b=compact(other['name'])
            if (a==b or (min(len(a),len(b))>=3 and (a in b or b in a))) and haversine_m(row,other)<=50:
                matched=True;break
        if matched: rejected['existing_near_duplicate']+=1;continue
        accepted.append(row)
    return accepted,dict(rejected)


if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--input-dir',type=Path,required=True);args=ap.parse_args()
    rows=json.loads((args.input_dir/'review_rows.json').read_text())
    existing=json.loads((args.input_dir/'production.json').read_text())
    accepted,rejected=reconcile(rows,existing)
    (args.input_dir/'publish_rows.json').write_text(json.dumps(accepted,ensure_ascii=False))
    report={'reviewed':len(rows),'existing':len(existing),'publishable':len(accepted),'excluded':rejected,'by_prefecture':dict(Counter(r['prefecture'] for r in accepted))}
    (args.input_dir/'reconciliation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False))
