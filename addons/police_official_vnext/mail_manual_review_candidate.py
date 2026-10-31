"""R15: offline PRIVATE manual-review bridge for mail-keishicho delivery cards.

Inputs stay inside one owner-only directory outside the MAP repository. The
original official JSON and R9 review packet are checked against each other; the
R11 most-recent window version must match the same raw export. Only expressly
reviewed, minimized summary text is copied to a PRIVATE, non-publishable card
candidate. This tool NEVER makes a public JSON, calls a server/DB, verifies a
police-issued incident ID, or authorizes deployment.

Review declarations and regular expressions are NOT proof of anonymization,
source authenticity, absence of corrections, or editorial/legal approval.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
import re
import stat
import tempfile
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

from mail_json_private_review import normalize_private_review, SOURCE_ID, SOURCE_URL
from mail_identity_reconcile import _guard_path
from mail_period_snapshot import _validate_history

JST = timezone(timedelta(hours=9))
JST_RE = re.compile(r'^20\d\d-(?:0[1-9]|1[0-2])-[0-3]\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\+09:00$')
SHA64_RE = re.compile(r'^[0-9a-f]{64}$')
AREA_RE = re.compile(r'^[^0-9０-９\r\n<>]{1,31}(?:都|道|府|県|市|区|町|村)$')
CATEGORIES = frozenset(('子どもの安全', '声かけ等', '特殊詐欺', '防犯情報', 'その他'))
MAX_JSON_BYTES = 8_000_000
MAX_REVIEW_BYTES = 200_000
MAX_OUTPUT_BYTES = 100_000
# A heuristic warning net, not an identification/doxxing classifier. HUMAN
# checks are mandatory even if a string passes these intentionally strict tests.
SENSITIVE_TEXT = re.compile(
    r'(?:https?://|www\.|@|[0-9０-９]{2,}|[0-9０-９]|[\r\n\t<>]|'
    r'丁目|番地|号室|番地先|マンション|アパート|自宅|氏名|実名|電話番号|携帯番号|'
    r'メールアドレス|郵便番号|車両番号|ナンバープレート|小学校名|中学校名|住所)', re.IGNORECASE)


def read_private_json(path: Path, limit: int) -> dict:
    if not path.is_file() or path.stat().st_size > limit:
        raise ValueError('Invalid bounded private input file')
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Duplicate JSON field in private review')
            result[key] = value
        return result
    try:
        val = json.loads(path.read_text('utf-8-sig'), object_pairs_hook=pairs)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Invalid strict private JSON') from exc
    if not isinstance(val, dict):
        raise ValueError('Expected JSON object in private review')
    return val


def jst_date(value: object) -> datetime:
    if not isinstance(value, str) or not JST_RE.fullmatch(value):
        raise ValueError('Explicit reviewed JST datetime required')
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError('Impossible JST timestamp') from exc
    if parsed.strftime('%Y-%m-%dT%H:%M:%S%z')[:-2] + ':' + parsed.strftime('%z')[-2:] != value:
        raise ValueError('Noncanonical JST timestamp')
    return parsed


def exact(obj: object, names: set[str]) -> None:
    if not isinstance(obj, dict) or set(obj) != names:
        raise ValueError('Unknown manual-review fields; fail closed')


def safe_editorial_text(value: object, max_length: int, source_fields: dict) -> str:
    if not isinstance(value, str) or not value or value.strip() != value or len(value) > max_length:
        raise ValueError('Unsafe or empty manually edited text')
    if SENSITIVE_TEXT.search(value) or any(ord(c) < 32 or 0x7f <= ord(c) <= 0x9f for c in value):
        raise ValueError('Potential identifying or overly detailed text; hold for manual redaction')
    # Reject verbatim source bodies/titles and long source excerpts. This is a
    # conservative privacy net, not a promise that the content is harmless.
    for original in (source_fields['message'], source_fields['subject']):
        if value == original or (len(value) >= 20 and value in original):
            raise ValueError('Copied original source text; manual paraphrase required')
        for i in range(0, max(0, len(value) - 23)):
            if value[i:i+24] in original:
                raise ValueError('Long source excerpt; manual privacy review required')
    return value


def build_private_candidate(original: bytes, packet: dict, history: dict,
                            decisions: dict, *, now: datetime) -> tuple[dict, dict]:
    """Pure offline transformation, no writes, no automatic release."""
    if now.tzinfo is None:
        raise ValueError('Timezone-aware time required')
    now = now.astimezone(JST)
    if not original or len(original) > 2_000_000:
        raise ValueError('Official original must be bounded')
    # Fail if the untrusted original has repeated keys: Python json.loads would
    # otherwise keep the last value and falsely appear to have five clean fields.
    def unique_pairs(items):
        obj = {}
        for key, val in items:
            if key in obj:
                raise ValueError('Duplicate key in original police JSON')
            obj[key] = val
        return obj
    try:
        json.loads(original.decode('utf-8-sig', errors='strict'), object_pairs_hook=unique_pairs)
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Unreadable original police JSON') from exc
    regenerated = normalize_private_review(original)
    if regenerated != packet:
        raise ValueError('Private packet must exactly match ORIGINAL exported JSON')
    history = _validate_history(history)
    if history['source_id'] != SOURCE_ID or history['publication_enabled'] is not False:
        raise ValueError('Unexpected history origin/release')
    newest = history['versions'][-1]
    if newest['source_export_sha256'] != regenerated['source_export_sha256'] or newest['row_count'] != len(regenerated['records']):
        raise ValueError('Source export has changed; recheck official source and resubmit manual review')
    if newest['state'] != 'pending_manual_review':
        raise ValueError('Newest window is not awaiting manual review')
    exact(decisions, {'schema_version','kind','source_id','source_export_sha256',
                      'window_start','window_end_exclusive','window_version',
                      'window_candidate_sha256','reviewed_at','source_checked_at',
                      'privacy_checked_at','correction_check_completed',
                      'privacy_checklist','records'})
    if decisions['schema_version'] != 1 or decisions['kind'] != 'manual_police_mail_delivery_review' or \
       decisions['source_id'] != SOURCE_ID or decisions['source_export_sha256'] != regenerated['source_export_sha256'] or \
       decisions['window_start'] != history['window_start'] or \
       decisions['window_end_exclusive'] != history['window_end_exclusive'] or \
       type(decisions['window_version']) is not int or decisions['window_version'] != newest['version'] or \
       decisions['window_candidate_sha256'] != newest['candidate_sha256'] or \
       decisions['correction_check_completed'] is not True:
        raise ValueError('Manual review does not refer to the exact current export/window')
    exact(decisions['privacy_checklist'], {
        'identifying_people_removed','specific_locations_removed',
        'original_facts_preserved','third_party_rights_checked',
        'official_source_current_checked','editorial_attribution_checked'})
    if any(v is not True for v in decisions['privacy_checklist'].values()):
        raise ValueError('All human privacy/factual/rights checks must be documented')
    reviewed = jst_date(decisions['reviewed_at'])
    source_checked = jst_date(decisions['source_checked_at'])
    privacy_checked = jst_date(decisions['privacy_checked_at'])
    for when in (reviewed, source_checked, privacy_checked):
        if when > now:
            raise ValueError('Future review/check timestamp')
    if not (timedelta() <= reviewed-source_checked <= timedelta(hours=24)) or not (
        timedelta() <= reviewed-privacy_checked <= timedelta(hours=24)) or now-reviewed > timedelta(hours=24):
        raise ValueError('Stale or out-of-order human review; hold')
    rows = regenerated['records']
    if not isinstance(decisions['records'], list) or len(decisions['records']) > len(rows):
        raise ValueError('Invalid manual selection count')
    keyed = {r['local_review_row_key']: r for r in rows}
    payload_counts = Counter(r['internal_content_sha256'] for r in rows)
    seen = set()
    cards = []
    trace = []
    excluded = held = 0
    for decision in decisions['records']:
        if not isinstance(decision, dict) or set(decision) not in (
            {'local_review_row_key','decision'},
            {'local_review_row_key','decision','headline','summary','category',
             'delivered_at','delivery_time_reviewed','display_area','area_reviewed',
             'manual_confirmed','privacy_confirmed','correction_confirmed',
             'duplicate_occurrence_checked'}):
            raise ValueError('Unknown or incomplete manual decision schema')
        key = decision['local_review_row_key']
        if not isinstance(key, str) or key not in keyed or key in seen:
            raise ValueError('Unknown or duplicated private review row reference')
        seen.add(key)
        if decision['decision'] in ('hold', 'exclude') and len(decision) == 2:
            held += decision['decision']=='hold'
            excluded += decision['decision']=='exclude'
            continue
        if decision['decision'] != 'include' or len(decision) != 13:
            raise ValueError('Only explicitly reviewed inclusion is allowed')
        if len(cards) >= 50:
            raise ValueError('Too many approved cards for the existing MAP display')
        row = keyed[key]
        if any(decision[k] is not True for k in (
            'manual_confirmed','privacy_confirmed','correction_confirmed','delivery_time_reviewed')):
            raise ValueError('An included row lacks human confirmation')
        if payload_counts[row['internal_content_sha256']] > 1 and decision['duplicate_occurrence_checked'] is not True:
            raise ValueError('Repeated identical delivery payload requires individual review')
        if decision['duplicate_occurrence_checked'] not in (True, False):
            raise ValueError('Invalid duplicate review declaration')
        category = decision['category']
        if category not in CATEGORIES:
            raise ValueError('Unknown reviewed delivery category')
        original_fields = row['raw_fields_private']
        headline = safe_editorial_text(decision['headline'], 90, original_fields)
        summary = safe_editorial_text(decision['summary'], 260, original_fields)
        delivered = jst_date(decision['delivered_at'])
        if delivered > reviewed or reviewed-delivered > timedelta(days=30):
            raise ValueError('Unverified, future or stale delivery timestamp')
        area = decision['display_area']
        if area is None:
            if decision['area_reviewed'] is not False:
                raise ValueError('Unknown area must stay unknown')
        elif not isinstance(area, str) or not AREA_RE.fullmatch(area) or decision['area_reviewed'] is not True:
            raise ValueError('Area must be an explicitly reviewed municipality or broader')
        local_ref = 'local-'+hashlib.sha256((regenerated['source_export_sha256']+':'+key).encode('ascii')).hexdigest()[:24]
        cards.append({
            'local_card_ref':local_ref,'headline':headline,'summary':summary,
            'category':category,'delivered_at':decision['delivered_at'],
            'delivery_time_reviewed':True,'display_area':area,'area_reviewed':area is not None,
            'manual_review_status':'approved','privacy_review_status':'approved',
            'correction_review_status':'checked'})
        trace.append({'private_source_row_number':row['local_export_row_number'],
                      'private_source_payload_sha256':row['internal_content_sha256'],
                      'local_card_ref':local_ref})
    remaining_held = len(rows) - len(seen) + held
    # Release OFF is intentional. Hand edits to flip this flag are NOT genuine
    # authorization; future publication must have server/admin release gate.
    expires = reviewed + timedelta(hours=24)
    feed = {
        'schema_version':1,'kind':'police_mail_delivery_messages_manual_review',
        'source_url':SOURCE_URL,'policy_url':SOURCE_URL+'policy','license':'CC-BY-4.0',
        'identity_scope':'delivery_message_not_incident','publication_enabled':False,
        'human_review_completed':True,'privacy_review_completed':True,
        'correction_check_completed':True,
        'original_export_sha256':regenerated['source_export_sha256'],
        'reviewed_at':decisions['reviewed_at'], 'expires_at':expires.isoformat(timespec='seconds'),
        'cards':cards}
    draft = {
        'schema_version':1,'status':'PRIVATE_REVIEWED_DELIVERY_CARDS_HOLD_NOT_FOR_UPLOAD',
        'source_id':SOURCE_ID,'window_period_key':history['period_key'],
        'window_candidate_sha256':newest['candidate_sha256'],
        'decision_file_sha256':hashlib.sha256(json.dumps(decisions,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
        'candidate_for_existing_map_private_only':feed,
        'source_review_trace_private_only':trace,
        'unreviewed_rows_held':remaining_held,'excluded_rows':excluded,
        'official_event_id_verified':False,'source_correction_equivalence_verified':False,
        'publication_enabled':False,'release_authorized':False,
        'deployable':False,'supabase_stage_allowed':False,'points_awarded':False,
        'notice':'審査メモ・候補は非公開。元配信原文・個人情報をGit/Drive/公開ZIPへ移さず、実運用の再審査とサーバ側権限・公開承認なしに掲載しない。'}
    summary_counts = {'status':draft['status'],'eligible_private_card_candidates':len(cards),
                      'unreviewed_rows_held':remaining_held,'excluded_rows':excluded,
                      'publication_enabled':False,'deployable':False,'db_changes':False}
    return draft,summary_counts


def write_private_candidate(source: Path, packet: Path, window_history: Path,
                            decisions: Path, output: Path, *, now: datetime | None = None) -> dict:
    paths = [source, packet, window_history, decisions]
    verified = [_guard_path(p, must_exist=True) for p in paths]
    target = _guard_path(output, must_exist=False, expected_dir=verified[0].parent)
    if any(p.parent != target.parent for p in verified) or len(set(verified+[target])) != 5:
        raise ValueError('Distinct files must stay inside one owner-only private folder')
    for file in verified:
        st = file.stat()
        if not stat.S_ISREG(st.st_mode) or st.st_nlink!=1 or stat.S_IMODE(st.st_mode)&0o077:
            raise ValueError('Private source inputs must be regular owner-only files (0600)')
    if any(p.stat().st_size>cap for p,cap in zip(verified,
                           (2_000_000,MAX_JSON_BYTES,MAX_JSON_BYTES,MAX_REVIEW_BYTES))):
        raise ValueError('Oversized private input')
    lock = target.with_name(target.name+'.lock')
    if lock.is_symlink():
        raise ValueError('Symlink lock not permitted')
    fd=os.open(lock, os.O_RDWR|os.O_CREAT|getattr(os,'O_NOFOLLOW',0),0o600)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode) or os.fstat(fd).st_nlink!=1:
            raise ValueError('Unsafe lock file')
        os.fchmod(fd,0o600)
        fcntl.flock(fd, fcntl.LOCK_EX)
        original=verified[0].read_bytes()
        draft,result=build_private_candidate(original,read_private_json(verified[1],MAX_JSON_BYTES),
            read_private_json(verified[2],MAX_JSON_BYTES),read_private_json(verified[3],MAX_REVIEW_BYTES),
            now=now or datetime.now(JST))
        body=(json.dumps(draft,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode('utf-8')
        if len(body)>MAX_OUTPUT_BYTES:
            raise ValueError('Private candidate oversized')
        temp_fd,temp=tempfile.mkstemp(prefix='.mail_review_candidate_',dir=target.parent)
        try:
            with os.fdopen(temp_fd,'wb') as fout:
                os.fchmod(fout.fileno(),0o600)
                fout.write(body);fout.flush();os.fsync(fout.fileno())
            os.replace(temp,target)
        finally:
            if os.path.exists(temp):os.unlink(temp)
        return result
    finally:
        fcntl.flock(fd,fcntl.LOCK_UN);os.close(fd)


def main() -> int:
    cli=argparse.ArgumentParser(description='R15 owner-only PRIVATE card candidate; cannot publish')
    for name in ('original','packet','window_history','decisions','output'):
        cli.add_argument('--'+name.replace('_','-'),type=Path,required=True)
    args=cli.parse_args()
    summary=write_private_candidate(args.original,args.packet,args.window_history,args.decisions,args.output)
    print(json.dumps(summary,ensure_ascii=False,sort_keys=True))
    return 0


if __name__=='__main__':
    raise SystemExit(main())
