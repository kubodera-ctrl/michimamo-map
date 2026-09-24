import assert from 'node:assert/strict';
import {shortDefault,longDefault} from '../src/defaults';
import {evaluateRights} from '../src/rights';

const ok=evaluateRights(shortDefault);
assert.equal(ok.renderAllowed,true);
assert.equal(ok.publishEligible,true);

const blocked=evaluateRights({...shortDefault,rightsLevel:'BLOCKED'});
assert.equal(blocked.renderAllowed,false);
assert.equal(blocked.publishEligible,false);

const uiBlocked=evaluateRights({...shortDefault,sourceUiFree:false});
assert.equal(uiBlocked.renderAllowed,false);

const lowVariety=evaluateRights(longDefault);
assert.equal(lowVariety.renderAllowed,true);
assert.equal(lowVariety.publishEligible,false);
assert.equal(lowVariety.requiresHumanReview,true);

console.log('rights gate tests passed');
