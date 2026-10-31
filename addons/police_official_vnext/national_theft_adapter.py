"""47-prefecture theft-seven offline adapter for the EXISTING machimamo MAP.

No nationwide dataset is 'connected' merely because its URL appears in registry.
Per-prefecture exact source file, license, column mapping and refresh contract must
be verified individually before any data publish or hosted source activation.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path
from cumulative_sources import decode_csv,clean,json_sha,atomic_write

METHODS = ("ひったくり", "車上ねらい", "部品ねらい", "自動販売機ねらい", "自動車盗", "オートバイ盗", "自転車盗")
REGISTRY = Path(__file__).parent / "official_source_registry.json"


def normalize(rows: list[dict], registry: dict, *, jis: str, mapping: dict,
              source_file_sha256: str, source_url: str) -> dict:
    if registry.get('schema_version') != 1 or registry.get('data_ingestion_enabled') is not False:
        raise ValueError('Only the existing 47-source link-only registry is accepted')
    matches=[x for x in registry.get('sources',[]) if x.get('jis')==jis]
    if len(matches)!=1 or not re.fullmatch(r'\d{2}',jis):
        raise ValueError('Unknown/duplicate prefecture code')
    source=matches[0]
    if source.get('data_status')!='link_only' or source.get('rights_status')!='pending_per_prefecture':
        raise ValueError('Unverified nationwide rights state')
    if source_url != source.get('source_page'):
        raise ValueError('Canonical official source URL must match registry')
    if not re.fullmatch(r'[a-f0-9]{64}',source_file_sha256):
        raise ValueError('Actual source file hash required')
    if not isinstance(mapping,dict) or set(mapping)-{'municipality','area','kind','occurred_at','source_record_id'} or \
      not all(k in mapping for k in ('municipality','area','kind')) or \
      len(set(mapping.values())) != len(mapping) or any(not isinstance(x,str) or not x for x in mapping.values()):
        raise ValueError('Unknown/unverified per-prefecture source column mapping')
    if not rows or len(rows)>100000 or any(v not in rows[0] for v in mapping.values()):
        raise ValueError('Official CSV header mismatch or oversized/empty input')
    out={}
    for row in rows:
        city=clean(row[mapping['municipality']],80)
        area=clean(row[mapping['area']],100)
        method=clean(row[mapping['kind']],50)
        date=clean(row[mapping['occurred_at']],40) if 'occurred_at' in mapping else None
        orig_id=clean(row[mapping['source_record_id']],120) if 'source_record_id' in mapping else None
        if not city or not area or method not in METHODS:
            raise ValueError('Unknown theft method or geographic precision')
        # Do not infer exact coordinates or a date from a neighborhood label.
        if date and not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date):
            raise ValueError('Unverified original event date format')
        event_key=json_sha([jis,orig_id or '', city,area,method,date])[:32]
        rec={"id":event_key,"prefecture":source['prefecture'],"jis":jis,
             "municipality":city,"area_label":area,"theft_method":method,
             "occurred_at":date or None,"source_record_id":orig_id or None,
             "source_url":source_url,"source_file_sha256":source_file_sha256,
             "location_precision":"area_only","latitude":None,"longitude":None,
             "rights_status":"unverified","review_status":"pending_identity" if not orig_id else "pending",
             "identity_verified":bool(orig_id)}
        if event_key in out and out[event_key]!=rec:
            raise ValueError('Conflicting nationwide duplicated ID')
        out[event_key]=rec
    return {"schema_version":1,"dataset":"nationwide_theft_seven","prefecture":source['prefecture'],
            "jis":jis,"source_url":source_url,"source_file_sha256":source_file_sha256,
            "license":"per_prefecture_review_required","rights_status":"unverified",
            "publication_enabled":False,"records":list(out.values()),"source_kind":"annual_not_real_time",
            "disclaimer":"過去の公式記録であり速報・危険度予測ではありません。根拠ない事件地点ピンは作りません。"}


def run(input_path:Path,mapping_path:Path,output_path:Path,*,jis:str,source_url:str)->dict:
    registry=json.loads(REGISTRY.read_text(encoding='utf-8'))
    data=input_path.read_bytes()
    rows=decode_csv(data)
    mapping=json.loads(mapping_path.read_text(encoding='utf-8'))
    if mapping.get('jis')!=jis or mapping.get('source_url')!=source_url:
        raise ValueError('External source mapping not pinned to this prefecture')
    result=normalize(rows,registry,jis=jis,mapping=mapping['columns'],
        source_file_sha256=hashlib.sha256(data).hexdigest(),source_url=source_url)
    atomic_write(output_path,result)
    return {"dataset":"nationwide_theft_seven","prefecture":result['prefecture'],
        "rows":len(result['records']),"pending":True,"production_changes":0,
        "source_file_sha256":result['source_file_sha256']}


def main():
    p=argparse.ArgumentParser(description='Nonproduction ONLY, no network/DB')
    p.add_argument('--input',type=Path,required=True);p.add_argument('--mapping',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True);p.add_argument('--jis',required=True)
    p.add_argument('--source-url',required=True)
    a=p.parse_args(); print(json.dumps(run(a.input,a.mapping,a.output,jis=a.jis,source_url=a.source_url),ensure_ascii=False))
if __name__=='__main__':main()
