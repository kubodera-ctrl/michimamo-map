'use strict';
const assert = require('node:assert/strict');
const c = require('./news-workflow-state-contract.cjs');

const blockedCurrent = {
  service:'machimamo', candidate:'READY', production:'NOT_CONNECTED',
  render:'RENDERER_BLOCKED_BY_EXACT_V7_SOURCE', qc:'NOT_CONNECTED',
  approval:'NOT_CONNECTED', publishingPreview:'NOT_CONNECTED',
  platforms:{X:'CONNECTION_REQUIBED',TIKTOK:'CONNECTION_REQUIRED'}
};
assert.equal(c.validateWorkflowState(blockedCurrent).valid,true);

const complete = {
  service:'machimamo', candidate:'READY', production:'FROZEN', render:'SUCCEEDED',
  qc:'PASSED', approval:'APPROVED', publishingPreview:'READY',
  platforms:{X:'POSTED',TIKTOK:'PROCESSING'}, revisionId:'rev_1', renderId:'render_1'
};
assert.equal(c.validateWorkflowState(complete).valid,true);

let r=c.validateWorkflowState({...complete,production:'DRAFT'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('render SUCCEEDED')));

r=c.validateWorkflowState({...complete,render:'PROCESSING'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('QC PASSED')));

r=c.validateWorkflowState({...complete,qc:'PENDING'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('approval APPROVED')));

r=c.validateWorkflowState({...complete,approval:'PENDING'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('publishing preview READY')));

r=c.validateWorkflowState({...complete,publishingPreview:'PENDING'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('platform POSTED')));

r=c.validateWorkflowState({...complete,revisionId:null});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('revisionId')));

const p=c.readOnlyProjection(blockedCurrent);
assert.equal(p.render,'RENDERER_BLOCKED_BY_EXACT_V7_SOURCE');
assert.equal(p.platforms.X,'CONNECTION_REQUIRED');
console.log('PASS news workflow state contract: explicit domain prerequisites, UI-independent QC/approval/publishing gates');
