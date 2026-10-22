import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeFetchedSourcePayload} from '../../cloudflare/machiibe-pipeline/src/normalize-source-payload';
import type {SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';

const source:SourcePolicySnapshot={
  sourceId:7,sourceName:'fixture',sourceType:'open_data',prefecture:'三重県',municipality:'津市',
  baseUrl:'https://events.example.jp',feedUrl:'https://events.example.jp/feed.csv',fetchMethod:'OPEN_DATA',
  termsStatus:'pending',robotsStatus:'pending',commercialUseStatus:'unknown',reuseStatus:'unknown',
  redistributionStatus:'unknown',cacheStatus:'unknown',imageUseStatus:'unknown',snsUseStatus:'unknown',
  attributionRequirement:null,sourceStage:'CANDIDATE',lastTermsCheckedAt:null,updateFrequencyMinutes:1440,
  lastCheckedAt:null,lastSuccessAt:null,failureCount:0,active:true,priority:50,automatedFetchAllowed:false,
  etag:null,lastModified:null
};
const hash='a'.repeat(64);

test('shared OPEN_DATA adapter preserves stable identity and marks normalized row for review only',()=>{
  const result=normalizeFetchedSourcePayload(
    'event_id,イベント名,開始日,終了日,URL\n42,子ども体験,2026-11-01,2026-11-01,https://events.example.jp/e/42',
    source,hash
  );
  assert.equal(result.parsedCount,1);
  assert.equal(result.rows[0].sourceEventId,'42');
  assert.equal(result.rows[0].candidate.sourceHash,hash);
  assert.deepEqual(result.rows[0].blockers,[]);
  assert.equal(result.rows[0].status,'ready_for_review');
  assert.equal(result.publicationEnabled,false);
});

test('missing stable ID or official event URL remains review-blocked',()=>{
  const result=normalizeFetchedSourcePayload(
    'イベント名,開始日,終了日\n子ども体験,2026-11-01,2026-11-01',source,hash
  );
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].status,'needs_review');
  assert.ok(result.rows[0].blockers.includes('stable_source_event_id_required'));
  assert.ok(result.rows[0].blockers.includes('official_event_url_required'));
  assert.equal(result.publicationEnabled,false);
});

test('invalid raw hash and malformed JSON fail closed',()=>{
  assert.throws(()=>normalizeFetchedSourcePayload('[]',source,'dryrun-only'),/raw_response_sha256_required/);
  assert.throws(()=>normalizeFetchedSourcePayload('{bad json',{
    ...source,fetchMethod:'JSON_API'
  },hash),/source_json_invalid/);
});


test('duplicated stable IDs in one payload remain needs_review for every copy',()=>{
  const result=normalizeFetchedSourcePayload(
    'event_id,イベント名,開始日,終了日,URL\n42,親子体験A,2026-11-01,2026-11-01,https://events.example.jp/e/42\n42,親子体験B,2026-11-02,2026-11-02,https://events.example.jp/e/42',
    source,hash
  );
  assert.equal(result.rows.length,2);
  for(const row of result.rows){
    assert.equal(row.status,'needs_review');
    assert.ok(row.blockers.includes('duplicate_source_event_id_in_batch'));
  }
  assert.equal(result.publicationEnabled,false);
});

test('a malformed CSV row is never treated as review-ready just because a valid row exists',()=>{
  const result=normalizeFetchedSourcePayload(
    'event_id,イベント名,開始日,終了日,URL\n41,親子体験,2026-11-01,2026-11-01,https://events.example.jp/e/41\n42,broken-row',
    source,hash
  );
  assert.ok(result.parserWarnings.some(w=>w.startsWith('csv_column_mismatch')));
  assert.equal(result.rows.length,2);
  assert.ok(result.rows.every(row=>row.status==='needs_review'));
  assert.ok(result.rows.every(row=>row.blockers.some(x=>x.startsWith('source_parser_warning:'))));
});

test('overlarge preview item count is rejected before any persistence can be attempted',()=>{
  const csv=['event_id,イベント名,開始日,終了日,URL', ...Array.from({length:5001},(_,i)=>`${i},イベント${i},2026-11-01,2026-11-01,https://events.example.jp/e/${i}`)].join('\n');
  assert.throws(()=>normalizeFetchedSourcePayload(csv,source,hash),/source_payload_item_limit_exceeded/);
});
