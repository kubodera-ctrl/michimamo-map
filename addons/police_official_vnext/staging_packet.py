"""Offline transformation from existing MAP police snapshots to review-only DB packets.

Does not connect to DB or use any secret. Packet is PRIVATE and must not be
committed to a public repository if it contains real incident rows.
"""
from __future__ import annotations
import argparse,hashlib,json,re
from pathlib import Path
from cumulative_sources import atomic_write

SOURCES={
 'mail':'https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
 'precursor':'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html',
 'town_stats':'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html'
}
HASH=re.compile(r'^[a-f0-9]{64}$')

def documents_from_snapshot(dataset:str,snapshot:dict, *,source_file_sha256:str|None=None,
                            fixture_default:bool=True)->list[dict]:
 if dataset not in SOURCES or not isinstance(snapshot,dict) or snapshot.get('schema_version')!=1:
  raise ValueError('Unknown official source schema')
 if dataset=='mail':
  if snapshot.get('source_id')!='tokyo_mail_keishicho_opendata':raise ValueError('Wrong mail source')
  src_sha=source_file_sha256
  if not src_sha or not HASH.fullmatch(src_sha):raise ValueError('Mail source input SHA receipt required')
  items=snapshot.get('records',[])
  if not isinstance(items,list):raise ValueError('Wrong mail records')
  ret=[]
  for row in items:
   if row.get('source_id')!='tokyo_mail_keishicho_opendata' or not HASH.fullmatch(row.get('content_hash','')):
    raise ValueError('Wrong mail source/hash')
   if row.get('source_url')!=SOURCES['mail']:raise ValueError('Wrong origin')
   if row.get('location_precision')!='exact' and (row.get('latitude') is not None or row.get('longitude') is not None):
    raise ValueError('Area coordinate leaked into official data')
   ret.append(dict(dataset='mail',record_key=row['id'],revision=row['revision'],source_url=SOURCES['mail'],
     source_file_sha256=src_sha,content_hash=row['content_hash'],payload=row,
     period_year=None,period_month=None,source_status=row['source_status'],
     source_id_verified=bool(row.get('identity_verified')),is_fixture=fixture_default or bool(row.get('is_fixture')),
     requires_review=True))
  return ret
 if snapshot.get('dataset')!=dataset or snapshot.get('publication_enabled') is not False:
  raise ValueError('Expected non-public cumulative snapshot')
 releases=snapshot.get('releases')
 if not isinstance(releases,list):raise ValueError('Missing release history')
 ret=[]
 for release in releases:
  source_sha=release.get('source_file_sha256')
  if not isinstance(source_sha,str) or not HASH.fullmatch(source_sha):raise ValueError('Cumulative release source SHA required')
  records=release.get('records',[])
  if not isinstance(records,list) or any('latitude' in x and x['latitude'] is not None or 'longitude' in x and x['longitude'] is not None for x in records):
   raise ValueError('Unsafe cumulative location')
  year,month,rev=release['year'],release['through_month'],release['revision']
  if not isinstance(year,int) or not isinstance(month,int) or not isinstance(rev,int) or not (2000<=year<=2100 and 1<=month<=12 and rev>=1):
   raise ValueError('Bad cumulative release period')
  payload={'records':records,'year':year,'through_month':month,'dataset':dataset,'notice':snapshot.get('notice','')}
  canonical_digest=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
  ret.append(dict(dataset=dataset,record_key=f'{dataset}:{year}:{month:02d}',revision=rev,
    source_url=SOURCES[dataset],source_file_sha256=source_sha,content_hash=canonical_digest,
    payload=payload,period_year=year,period_month=month,source_status='active',
    source_id_verified=False,is_fixture=fixture_default,
    requires_review=bool(release.get('requires_review'))))
 return ret

def create_packet(dataset, snapshot, *, sha=None, fixture_default=True):
 docs=documents_from_snapshot(dataset,snapshot,source_file_sha256=sha,fixture_default=fixture_default)
 return {'schema_version':1,'status':'REVIEW_ONLY_NOT_DEPLOYED','source_id':dataset,'documents':docs,
         'source_data_private':True,'publication_enabled':False,'database_changes':False,
         'next_gate':'Only service_role staging via reviewed nonprod SQL after isolated QA; human reviewer must approve each version.'}

def main():
 p=argparse.ArgumentParser(description='Offline, no network or DB write')
 p.add_argument('--dataset',choices=tuple(SOURCES),required=True)
 p.add_argument('--snapshot',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
 p.add_argument('--input-sha256');p.add_argument('--verified-fixture-flag',action='store_true',
     help='Reserved for verified real source contract after manual source inspection; not an automatic license approval')
 a=p.parse_args()
 snapshot=json.loads(a.snapshot.read_text(encoding='utf-8'))
 out=create_packet(a.dataset,snapshot,sha=a.input_sha256,fixture_default=not a.verified_fixture_flag)
 if not a.output.parent.name.endswith('private'):
  raise ValueError('Private local output directory required; never commit real data')
 atomic_write(a.output,out)
 print(json.dumps({'staged_items':len(out['documents']),'source':a.dataset,'publication_enabled':False},ensure_ascii=False))
if __name__=='__main__':main()
