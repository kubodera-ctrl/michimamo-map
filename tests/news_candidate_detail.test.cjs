'use strict';

const assert = require('node:assert/strict');
const d = require('../news-candidate-detail.js');

const NOW = new Date('2026-09-28T00:00:00Z');

const legacy = {
  candidateId:'legacy-spot-2046',
  legacySpotId:2046,
  informationKind:'LEGACY_UNVERIFIED',
  title:'【防犯ニュース】旧候補',
  prefecture:'東京都',
  municipality:'新宿区',
  newsDate:'2026-09-18',
  acquiredAt:'2026-09-19T06:15:00Z',
  legacyAddress:'新宿区',
  legacyComment:'旧official本文',
  sourceStatus:'needs_review',
  factsStatus:'needs_review',
  rightsStatus:'needs_review',
  publishEligible:false
};

let view = d.toDetailView(legacy, { now: NOW });
assert.equal(view.service, 'machimamo');
assert.equal(view.legacy, true);
assert.equal(view.badge, '旧ニュース候補・要確認');
assert.equal(view.sourceEventId, '要確認');
assert.equal(view.sourceUrl, null);
assert.equal(view.sourceStatus, 'needs_review');
assert.equal(view.factsStatus, 'needs_review');
assert.equal(view.rightsStatus, 'needs_review');
assert.equal(view.correctionStatus, 'needs_review');
assert.equal(view.publishEligible, false);
assert.equal(view.classifierInclude, false);
assert.equal(view.pipeline.find(x => x[0] === 'Render')[1], '生成不可');
assert.ok(view.blockers.some(x => x.includes('一次source')));
assert.ok(view.blockers.some(x => x.includes('verifiedFacts')));
assert.ok(view.blockers.some(x => x.includes('rights')));
assert.ok(view.blockers.some(x => x.includes('correction')));

const canonical = {
  service:'machimamo',
  schemaVersion:'machimamo-news-candidate-v1',
  candidateId:'keishicho-open-data:TOKYO-20260924-001',
  sourceEventId:'TOKYO-20260924-001',
  informationKind:'POLICE_OFFICIAL',
  headline:'首都高速で逆走車を確認、通行規制',
  prefecture:'東京都',
  municipality:'江東区',
  newsDate:'2026-09-24',
  category:'TRAFFIC_INFORMATION',
  verifiedFacts:['首都高速道路で逆走車が確認された','通行規制が実施された'],
  sourceStatus:'verified',
  factsStatus:'verified',
  rightsStatus:'cleared',
  correctionStatus:'current',
  rightsScopeConfirmed:true,
  publishEligible:true,
  source:{
    name:'警視庁 メールけいしちょう OPEN DATA',
    url:'https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
    publishedAt:'2026-09-24T08:30:00+09:00',
    checkedAt:'2026-09-27T14:30:00Z',
    sourceHash:'a'.repeat(64)
  },
  rights:{
    rightsLevel:'CC_BY',
    commercialUseAllowed:true,
    attributionText:'出典：警視庁「メールけいしちょう」',
    rightsEvidenceUrl:'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy'
  },
  localityEvidence:{
    type:'impact',confirmed:true,prefecture:'東京都',municipality:'江東区',
    evidence:'警視庁OPEN DATAの地域情報'
  },
  selection:{
    include:true,priority:'high',topic:'TRAFFIC_WRONG_WAY',
    reason:'高速道路等の逆走は重大な交通安全事案',
    retention:{active:true,display:true,ageDays:4,state:'active_60d',label:'active（4日）'}
  }
};

view = d.toDetailView(canonical, { now: NOW });
assert.equal(view.legacy, false);
assert.equal(view.sourceEventId, 'TOKYO-20260924-001');
assert.equal(view.sourceHash, 'a'.repeat(64));
assert.equal(view.verifiedFacts.length, 2);
assert.equal(view.rightsLevel, 'CC_BY');
assert.equal(view.commercialUseAllowed, true);
assert.equal(view.classifierTopic, 'TRAFFIC_WRONG_WAY');
assert.equal(view.classifierPriority, 'high');
assert.equal(view.classifierInclude, true);
assert.equal(view.publishEligible, true);
assert.deepEqual(view.blockers, []);
assert.equal(view.pipeline.find(x => x[0] === 'Candidate')[1], 'Productionへ進める候補');
assert.match(view.pipeline.find(x => x[0] === 'Render')[1], /Renderer待ち/);

const html = d.renderDetailHtml(view);
assert.match(html, /sourceEventId/);
assert.match(html, /sourceHash/);
assert.match(html, /verifiedFacts/);
assert.match(html, /TRAFFIC_WRONG_WAY/);
assert.match(html, /publishEligible = true/);
assert.match(html, /Production Preview/);
assert.match(html, /Publishing Preview/);
assert.match(html, /news-detail-break/);

const blocked = d.toDetailView({
  ...canonical,
  candidateId:'keishicho-open-data:TOKYO-20260924-002',
  sourceEventId:'TOKYO-20260924-002',
  publishEligible:false,
  rightsStatus:'needs_review',
  rightsScopeConfirmed:false
}, { now: NOW });
assert.equal(blocked.publishEligible, false);
assert.ok(blocked.blockers.some(x => x.includes('rightsStatus')));
assert.ok(blocked.blockers.some(x => x.includes('rights scope')));

assert.equal(d.retentionState('2026-07-30', NOW).state, 'active_60d');
assert.equal(d.retentionState('2026-07-29', NOW).state, 'inactive_61_90d');
assert.equal(d.retentionState('2026-06-30', NOW).state, 'inactive_61_90d');
assert.equal(d.retentionState('2026-06-29', NOW).state, 'expired_over_90d');

console.log('PASS news candidate detail: legacy fail-closed, canonical fields/gates, pipeline, retention');
