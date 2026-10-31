"""Non-public, schema-only fallback for irregular official JSON exports.

Never prints or stores values of message body, recipient, sender or case details.
A valid JSON shape is not evidence of unique IDs or correction semantics.
"""
import hashlib
import json
from collections import Counter

MAX_BYTES = 2_000_000


def profile_bytes(raw: bytes) -> dict:
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError('invalid JSON export size')
    data = json.loads(raw.decode('utf-8-sig', errors='strict'))
    typ = 'list' if isinstance(data,list) else 'object' if isinstance(data,dict) else 'other'
    keys = sorted(data)[:40] if isinstance(data,dict) else []
    if isinstance(data,list):
        rows=data
        record_source='top_level_array'
    elif isinstance(data,dict):
        candidates=[(k,v) for k,v in data.items() if isinstance(v,list)]
        if len(candidates)!=1:
            rows=[];record_source='unknown_object_shape'
        else:
            record_source=candidates[0][0];rows=candidates[0][1]
    else:
        rows=[];record_source='unsupported_type'
    if len(rows)>20000:
        raise ValueError('too many JSON objects')
    shapes=Counter()
    union=set()
    for r in rows:
        if isinstance(r,dict):
            shapes[tuple(sorted(r))]+=1
            union.update(r)
        else:
            shapes[('__NONOBJECT__',)]+=1
    if len(union)>200:
        raise ValueError('too many JSON keys')
    return {
        'status':'JSON_SCHEMA_REVIEW_ONLY',
        'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
        'root_type':typ,'root_keys':keys,'array_selector':record_source,
        'data_rows':len(rows),'record_key_union':sorted(union),
        'distinct_record_object_key_shapes':len(shapes),
        'non_object_rows':sum(v for k,v in shapes.items() if k==('__NONOBJECT__',)),
        'row_values_logged':False,'importable':False,
        'identity_semantics_verified':False,'correction_semantics_verified':False,
        'publication_allowed':False
    }
