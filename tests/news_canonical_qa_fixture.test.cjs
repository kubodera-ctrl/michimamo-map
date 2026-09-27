'use strict';
const assert = require('node:assert/strict');
const fixtures = require('../news-canonical-qa-fixture.js');
const detail = require('../news-candidate-detail.js');

assert.equal(fixtures.length,3);
for(const candidate of fixtures){
  assert.equal(candidate.service,'machimamo');
  assert.equal(candidate.informationKind,'POLICE_OFFICIAL');
  assert.equal(candidate.fixtureOnly,true);
  assert.equal(candidate.publishEligible,true);
  assert.equal(candidate.productionEligible,true);
  assert.equal(candidate.rightsScopeConfirmed,true);
  assert.match(candidate.source.sourceHash,/^[0-9a-f]{64}$/);
  const view=detail.toDetailView(candidate,{now:new Date('2026-09-28T00:00:00Z')});
  assert.equal(view.legacy,false);
  assert.equal(view.publishEligible,true);
  assert.deepEqual(view.blockers,[]);
}
console.log('PASS canonical QA fixture: preview-only candidates open canonical detail without Production writes');
