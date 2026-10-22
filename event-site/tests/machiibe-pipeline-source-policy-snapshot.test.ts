import assert from 'node:assert/strict';
import test from 'node:test';
import {sourcePolicySnapshotFromRegionalRow,type RegionalSourcePolicyRow} from '../../cloudflare/machiibe-pipeline/src/source-policy-snapshot';

const row:RegionalSourcePolicyRow={
  id:7,name:'Fixture',source_kind:'open_data',prefecture:'三重県',municipality:'津市',
  homepage_url:'https://events.example.jp',data_url:'https://events.example.jp/feed.csv',
  fetch_method:'OPEN_DATA',terms_review_status:'reviewed_allowed',robots_status:'not_applicable',
  commercial_use_status:'allowed',reuse_status:'allowed',redistribution_status:'allowed',cache_status:'allowed',
  image_use_status_source:'unknown',sns_use_status:'unknown',attribution_requirement:'Fixture attribution',
  source_stage:'FETCH_ALLOWED',last_terms_checked_at:'2026-10-20T00:00:00.000Z',update_frequency_minutes:1440,
  last_checked_at:null,last_success_at:null,consecutive_failures:0,is_active:true,priority:50,
  automated_fetch_allowed:true,event_use_allowed:true,source_etag:null,source_last_modified:null
};

test('regional_sources row maps without losing the fetch and rights policy fields',()=>{
  const result=sourcePolicySnapshotFromRegionalRow(row);
  assert.deepEqual(result.blockers,[]);
  assert.equal(result.source.sourceId,7);
  assert.equal(result.source.fetchMethod,'OPEN_DATA');
  assert.equal(result.source.lastTermsCheckedAt,row.last_terms_checked_at);
  assert.equal(result.source.imageUseStatus,'unknown');
  assert.equal(result.source.automatedFetchAllowed,true);
});

test('missing policy values produce conservative snapshot and explicit blockers',()=>{
  const result=sourcePolicySnapshotFromRegionalRow({...row,fetch_method:null,terms_review_status:null,
    robots_status:null,commercial_use_status:null,redistribution_status:null,attribution_requirement:null,
    source_stage:null,last_terms_checked_at:null,data_url:'http://localhost/feed.csv'});
  assert.ok(result.blockers.includes('fetch_method_missing_or_invalid'));
  assert.ok(result.blockers.includes('terms_status_missing_or_invalid'));
  assert.ok(result.blockers.includes('source_feed_url_invalid'));
  assert.equal(result.source.fetchMethod,'MANUAL');
  assert.equal(result.source.sourceStage,'CANDIDATE');
  assert.equal(result.source.termsStatus,'pending');
  assert.equal(result.source.automatedFetchAllowed,false);
});

test('future review, missing attribution, invalid frequency, or inactive source cannot map as fetchable',()=>{
  const result=sourcePolicySnapshotFromRegionalRow({...row,last_terms_checked_at:'2026-10-22T00:00:00.000Z',
    attribution_requirement:' ',update_frequency_minutes:0,is_active:false},Date.parse('2026-10-21T00:00:00.000Z'));
  assert.ok(result.blockers.includes('terms_review_timestamp_invalid'));
  assert.ok(result.blockers.includes('attribution_missing'));
  assert.ok(result.blockers.includes('update_frequency_invalid'));
  assert.equal(result.source.automatedFetchAllowed,false);
});
