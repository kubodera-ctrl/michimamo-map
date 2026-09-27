'use strict';
const assert = require('node:assert/strict');
const p = require('./news-selection-policy.cjs');

const NOW = new Date('2026-09-27T12:00:00Z');
const base = {
  newsDate:'2026-09-25',
  prefecture:'東京都',
  municipality:'新宿区',
  localityEvidence:{type:'occurred',confirmed:true},
  officialSource:true,
  verifiedFacts:[]
};

let x = p.classifyCandidate({...base, headline:'首都高速で逆走車を確認、通行規制'}, NOW);
assert.equal(x.include,true);
assert.equal(x.priority,'high');
assert.equal(x.topic,'TRAFFIC_WRONG_WAY');

x = p.classifyCandidate({...base, headline:'新宿区で痴漢事案'}, NOW);
assert.equal(x.include,true);
assert.equal(x.priority,'high');
assert.equal(x.topic,'PERSON_SAFETY');

x = p.classifyCandidate({...base, headline:'新宿区を拠点とする全国的な万引きグループを摘発'}, NOW);
assert.equal(x.include,true);
assert.equal(x.priority,'high');
assert.equal(x.topic,'ORGANIZED_LOCAL');

x = p.classifyCandidate({
  ...base, municipality:'', localityEvidence:null, overseasOnly:true,
  headline:'海外で詐欺グループを逮捕'
}, NOW);
assert.equal(x.include,false);
assert.equal(x.priority,'exclude');

x = p.classifyCandidate({...base, headline:'羽田空港で入国時に違法物を税関が発見', publicSafetyImpact:false}, NOW);
assert.equal(x.include,false);
assert.equal(x.topic,'CUSTOMS_LOW_RELEVANCE');

x = p.classifyCandidate({...base, headline:'駅で飛び降り自殺、運転見合わせ', publicSafetyImpact:true}, NOW);
assert.equal(x.include,true);
assert.equal(x.priority,'conditional');
assert.equal(x.topic,'SELF_HARM_PUBLIC_IMPACT');

x = p.classifyCandidate({...base, headline:'出入国管理法違反で新宿区内で逮捕', officialSource:true}, NOW);
assert.equal(x.include,true);
assert.equal(x.topic,'IMMIGRATION_LOCAL_ARREST');

assert.deepEqual(p.retentionState('2026-07-29', NOW), {active:true,display:true,ageDays:60,state:'active_60d'});
assert.equal(p.retentionState('2026-07-28', NOW).active,false);
assert.equal(p.retentionState('2026-07-28', NOW).display,true);
assert.equal(p.retentionState('2026-06-28', NOW).display,false);

console.log('PASS news selection policy: 60-day retention, locality, priority categories, highway wrong-way');

const unconfirmed = p.classifyCandidate({
  ...base,
  headline:'新宿区で痴漢事案',
  localityEvidence:{type:'occurred',confirmed:false}
}, NOW);
assert.equal(unconfirmed.include,false,'explicit unconfirmed locality must not fall back to municipality text');

const notice = p.classifyCandidate({
  ...base,
  headline:'防犯イベントのお知らせ',
  category:'NOTICE'
}, NOW);
assert.equal(notice.include,false,'generic notice must be excluded');

const ordinaryTraffic = p.classifyCandidate({
  ...base,
  headline:'交通安全のお知らせ',
  category:'TRAFFIC_INFORMATION'
}, NOW);
assert.equal(ordinaryTraffic.include,false,'ordinary traffic information must not become a news candidate');

const fraudCategory = p.classifyCandidate({
  ...base,
  headline:'警察署からの注意情報',
  category:'SPECIAL_FRAUD_CALL'
}, NOW);
assert.equal(fraudCategory.include,true);
assert.equal(fraudCategory.priority,'high');
assert.equal(fraudCategory.topic,'FRAUD_LOCAL');

const childCategory = p.classifyCandidate({
  ...base,
  headline:'地域安全情報',
  category:'CHILD_SAFETY'
}, NOW);
assert.equal(childCategory.include,true);
assert.equal(childCategory.priority,'high');
assert.equal(childCategory.topic,'CHILD_SAFETY');
