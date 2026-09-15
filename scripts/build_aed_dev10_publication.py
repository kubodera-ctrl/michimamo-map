"""Generate one guarded, atomic SQL transaction per reviewed prefecture batch."""
import json
from pathlib import Path

from import_aed_open_data import sql_text

ROOT = Path('data/aed_dev10')
COLS = ('source_key,facility_type,name,prefecture,prefecture_code,municipality,address,phone,'
        'latitude,longitude,source_name,source_url,source_license,source_date,source_updated_at,'
        'installation_location,availability,geocode_source,quality_status,active,duplicate_candidate')


def build(source, rows, baseline):
    key = source['key']
    expected = sum(not r['duplicate_candidate'] for r in rows)
    payload = json.dumps(rows, ensure_ascii=False)
    assert '$aedjson$' not in payload
    south, north, west, east = source['review_bounds']
    return f"""-- Reviewed {source['prefecture']} / {source['municipality']}; no application schema changes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.safety_spots in share row exclusive mode;
lock table public.safety_spots_nationwide_stage in share row exclusive mode;
create temporary table dev10_batch on commit drop as
select * from json_populate_recordset(null::public.safety_spots_nationwide_stage,
    $aedjson${payload}$aedjson$::json);
do $guard$
begin
  if (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> {baseline}
     then raise exception 'Public baseline changed; reconcile again'; end if;
  if (select count(*) from dev10_batch) <> {len(rows)}
     or (select count(distinct source_key) from dev10_batch) <> {len(rows)}
     or (select count(*) from dev10_batch where not duplicate_candidate) <> {expected}
     then raise exception 'Batch cardinality changed'; end if;
  if exists (select 1 from dev10_batch where active is distinct from false
      or facility_type is distinct from 'aed' or name is null or name='' or address is null or address=''
      or latitude is null or longitude is null
      or latitude not between {south} and {north} or longitude not between {west} and {east}
      or source_license is distinct from 'CC BY 4.0'
      or prefecture is distinct from {sql_text(source['prefecture'])}
      or municipality is distinct from {sql_text(source['municipality'])}
      or source_url is distinct from {sql_text(source['source_url'])})
     then raise exception 'Batch identity/license/coordinate check failed'; end if;
  if exists (select 1 from dev10_batch b join public.safety_spots_nationwide_stage s using(source_key))
     or exists (select 1 from dev10_batch b join public.safety_spots s using(source_key))
     then raise exception 'Previously imported keys found; do not overwrite'; end if;
  if exists (
    select 1 from dev10_batch b join public.safety_spots p
      on p.facility_type='aed' and p.active and not p.duplicate_candidate
    cross join lateral (select
      regexp_replace(b.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') bn,
      regexp_replace(p.name,'[^0-9A-Za-z一-龠ぁ-んァ-ヶ]','','g') pn) n
    where not b.duplicate_candidate and (
      (n.bn=n.pn and regexp_replace(b.address,'[[:space:]　-]','','g')=regexp_replace(p.address,'[[:space:]　-]','','g'))
      or (abs(b.latitude-p.latitude)<0.001 and abs(b.longitude-p.longitude)<0.002
          and (n.bn=n.pn or (least(length(n.bn),length(n.pn))>=3
              and (strpos(n.bn,n.pn)>0 or strpos(n.pn,n.bn)>0))))))
     then raise exception 'Public exact/near duplicate candidate; review before publishing'; end if;
end;
$guard$;
insert into public.safety_spots_nationwide_stage ({COLS},review_decision,review_reason,review_next_action,reviewed_at)
select {COLS},case when duplicate_candidate then 'hold' else 'published' end,
  case when duplicate_candidate then '同一施設の近接名称候補。設置位置の区別を要確認'
       else {sql_text(source.get('review_reason', '自治体公式CSV・CC BY 4.0・公式座標・本番重複照合を確認'))} end,
  case when duplicate_candidate then '公式設置位置を確認してから再審査' else '公開DBへ反映済み' end,now()
from dev10_batch;
update dev10_batch set active=true,quality_status='verified' where not duplicate_candidate;
insert into public.safety_spots ({COLS}) select {COLS} from dev10_batch where not duplicate_candidate;
do $guard$
begin
  if (select count(*) from public.safety_spots p join dev10_batch b using(source_key)
      where p.active and not p.duplicate_candidate) <> {expected}
     or (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) <> {baseline + expected}
     then raise exception 'Post-insert count mismatch'; end if;
end;
$guard$;
select {sql_text(key)} as batch,{expected} as inserted,{len(rows)-expected} as held,
    (select count(*) from public.safety_spots where facility_type='aed' and active and not duplicate_candidate) as public_aed;
commit;
"""


def main():
    baseline = 39095
    for source in json.loads((ROOT / 'sources.json').read_text())['sources']:
        rows = json.loads((ROOT / (source['key'] + '_review.json')).read_text())
        sql = build(source, rows, baseline)
        Path('scripts/publish_aed_dev10_' + source['key'] + '_20260915.sql').write_text(sql)
        baseline += sum(not r['duplicate_candidate'] for r in rows)
    print('Expected final public AED:', baseline)


if __name__ == '__main__':
    main()
