'use strict';
const assert = require('node:assert/strict');
const c = require('./news-production-preview-contract.cjs');

const canonical = {
  service:'machimamo',
  candidateId:'cand_001',
  informationKind:'POLICE_OFFICIAL',
  sourceEventId:'keishicho_001',
  headline:'中学生女性へのつきまとい',
  prefecture:'東京都', municipality:'練馬区', newsDate:'2026-09-24',
  source:{sourceHash:'a'.repeat(64)},
  verifiedFacts:['2026-09-24公開','練馬区内の事案'],
  publishEligible:true,
  selection:{include:true,retention:{active:true}}
};

let p = c.buildProductionPreview(canonical);
assert.equal(p.schemaVersion,'machimamo-news-production-preview-v1');
assert.equal(p.service,'machimamo');
assert.equal(p.mode,'SINGLE');
assert.equal(p.readOnly,true);
assert.equal(p.connected,false);
assert.equal(p.status,'READY_FOR_PRODUCTION_PREVIEW');
assert.deepEqual(p.blockers,[]);
assert.equal(p.downstream.productionRecord,'NOT_CONNECTED');
assert.equal(p.downstream.render,'RENDERER_BLOCKED_BY_EXACT_V7_SOURCE');
assert.equal(p.downstream.externalPublishing,'CONNECTION_REQUIRED');

p = c.buildProductionPreview({...canonical,informationKind:'LEGACY_UNVERIFIED',legacy:true,publishEligible:false});
assert.equal(p.status,'BLOCKED');
assert.ok(p.blockers.some(x=>x.includes('LEGACY_UNVERIFIED')));
assert.ok(p.blockers.some(x=>x.includes('publishEligible')));

p = c.buildProductionPreview({...canonical,sourceEventId:'',source:{sourceHash:'bad'}});
assert.equal(p.status,'BLOCKED');
assert.ok(p.blockers.some(x=>x.includes('sourceEventId')));
assert.ok(p.blockers.some(x=>x.includes('sourceHash')));

p = c.buildProductionPreview({...canonical,selection:{include:false,reason:'classifier excluded',retention:{active:true}}},{mode:'WEEKLY'});
assert.equal(p.mode,'WEEKLY');
assert.equal(p.status,'BLOCKED');
assert.ok(p.blockers.includes('classifier excluded'));

assert.throws(()=>c.buildProductionPreview(canonical,{mode:'SHORT'}));
console.log('PASS news production preview contract: canonical admission, legacy fail-closed, read-only downstream states');
