'use strict';
// Real R15 Python output, but entirely synthetic. Never read actual police data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=require('../official-police-hub.js');
const file=process.argv[2];
if(!file||!file.startsWith('/'))throw Error('absolute generated synthetic fixture required');
const draft=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(draft.status,'PRIVATE_REVIEWED_DELIVERY_CARDS_HOLD_NOT_FOR_UPLOAD');
assert.equal(draft.deployable,false);
assert.equal(draft.release_authorized,false);
assert.equal(draft.publication_enabled,false);
assert.equal(draft.supabase_stage_allowed,false);
assert.equal(draft.official_event_id_verified,false);
const feed=draft.candidate_for_existing_map_private_only;
assert.equal(feed.publication_enabled,false);
assert.deepEqual(Object.keys(feed.cards[0]).sort(),[
 'area_reviewed','category','correction_review_status','delivered_at','delivery_time_reviewed',
 'display_area','headline','local_card_ref','manual_review_status','privacy_review_status','summary'
].sort());
assert.throws(()=>api.validateReviewedMailCards(feed,Date.parse('2026-11-01T09:00:00+09:00')),
 /reviewed mail feed not approved/);
// Test shape parity ONLY: never write this modification to a file or publish.
const toy={...feed,publication_enabled:true};
const safe=api.validateReviewedMailCards(toy,Date.parse('2026-11-01T09:00:00+09:00'));
assert.equal(safe.length,1);
assert.equal(safe[0].display_area,'港区');
assert.ok(!JSON.stringify(safe).includes('local-'));
assert.ok(!JSON.stringify(draft).includes('SYNTHETIC PRIVATE DATA'));
console.log('R15_PRIVATE_TO_R14_CONTRACT_NO_AUTO_RELEASE_PASS');
