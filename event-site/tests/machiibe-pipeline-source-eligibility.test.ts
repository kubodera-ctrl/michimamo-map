import assert from 'node:assert/strict';
import test from 'node:test';
import {sourceAutomationBlockers,type SourceEligibilityInput} from '../../cloudflare/machiibe-pipeline/src/source-eligibility';

const now=Date.parse('2026-10-21T12:00:00.000Z');
const allowed:SourceEligibilityInput={
  is_active:true,automated_fetch_allowed:true,event_use_allowed:true,terms_review_status:'reviewed_allowed',
  acquisition_mode:'open_data',robots_status:'not_applicable',commercial_use_status:'allowed',
  reuse_status:'allowed',redistribution_status:'allowed',cache_status:'allowed',
  source_stage:'FETCH_ALLOWED',fetch_method:'OPEN_DATA',last_terms_checked_at:'2026-10-20T00:00:00.000Z',
  attribution_requirement:'CC BY 4.0 / source attribution',update_frequency_minutes:1440
};

test('complete current Source evidence permits the collector policy gate',()=>{
  assert.deepEqual(sourceAutomationBlockers(allowed,now),[]);
});

test('missing or future terms-review timestamp blocks collection',()=>{
  assert.ok(sourceAutomationBlockers({...allowed,last_terms_checked_at:null},now).includes('terms_review_timestamp_invalid'));
  assert.ok(sourceAutomationBlockers({...allowed,last_terms_checked_at:'2026-10-22T00:00:00.000Z'},now).includes('terms_review_timestamp_invalid'));
});

test('unresolved rights, access, source stage, and attribution fail closed',()=>{
  const source={...allowed,robots_status:'pending',commercial_use_status:'unknown',reuse_status:'unknown',redistribution_status:'unknown',cache_status:'unknown',source_stage:'CANDIDATE',attribution_requirement:null};
  assert.deepEqual(sourceAutomationBlockers(source,now),[
    'robots_not_allowed','commercial_use_not_allowed','reuse_not_allowed','redistribution_not_allowed',
    'cache_not_allowed','source_stage_not_fetchable','attribution_missing'
  ]);
});

test('automation authorization and polling configuration are independent hard gates',()=>{
  const source={...allowed,automated_fetch_allowed:false,update_frequency_minutes:null};
  assert.deepEqual(sourceAutomationBlockers(source,now),['automated_fetch_not_allowed','update_frequency_invalid']);
});
