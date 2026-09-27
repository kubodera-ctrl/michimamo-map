'use strict';

const assert = require('node:assert/strict');
const a = require('./keishicho-open-data-adapter.cjs');

const checkedAt = new Date('2026-09-27T14:30:00Z');
const base = {
  sourceEventId: 'TOKYO-20260923-001',
  sourceCategory: '声かけ等',
  municipality: '練馬区',
  occurredAt: '2026-09-23T22:00:00+09:00',
  publishedAt: '2026-09-24T00:00:00+09:00',
  headline: '中学生女性へのつきまとい',
  body: '平和台2丁目の路上で中学生女性が不審な者につきまとわれたと警視庁が配信。',
  correctionStatus: 'current',
  rightsScopeConfirmed: true,
  localityType: 'occurred',
  localityConfirmed: true
};

function build(overrides = {}) {
  return a.buildCanonicalCandidate({ ...base, ...overrides }, { checkedAt });
}

// normal current information
let result = build();
assert.equal(result.validation.valid, true);
assert.equal(result.validation.publishEligible, true);
assert.equal(result.productionEligible, true);
assert.equal(result.candidate.sourceEventId, 'TOKYO-20260923-001');
assert.equal(result.candidate.category, 'APPROACH_OR_SUSPICIOUS');
assert.equal(result.candidate.rights.rightsLevel, 'CC_BY');
assert.equal(result.candidate.rights.attributionText, '出典：警視庁「メールけいしちょう」');
assert.match(result.candidate.source.sourceHash, /^[0-9a-f]{64}$/);
assert.equal(result.selection.include, true);
assert.equal(result.selection.priority, 'high');
assert.equal(result.selection.topic, 'CHILD_SAFETY');

// correction/update must change sourceHash but remain current when explicitly current
const corrected = build({ body: base.body + ' 訂正後の本文。' });
assert.notEqual(corrected.candidate.source.sourceHash, result.candidate.source.sourceHash);
assert.equal(corrected.candidate.correctionStatus, 'current');
assert.equal(corrected.productionEligible, true);

// withdrawn
result = build({ sourceEventId:'TOKYO-WITHDRAWN', correctionStatus:'withdrawn' });
assert.equal(result.validation.valid, true);
assert.equal(result.validation.publishEligible, false);
assert.equal(result.productionEligible, false);

// sourceEventId missing
result = build({ sourceEventId:'' });
assert.equal(result.validation.valid, false);
assert.equal(result.validation.publishEligible, false);
assert.equal(result.productionEligible, false);

// rightsScope unconfirmed
result = build({ sourceEventId:'TOKYO-RIGHTS-UNKNOWN', rightsScopeConfirmed:false });
assert.equal(result.validation.valid, true);
assert.equal(result.candidate.rightsStatus, 'needs_review');
assert.equal(result.validation.publishEligible, false);
assert.equal(result.productionEligible, false);

// locality explicitly unconfirmed
result = build({ sourceEventId:'TOKYO-LOCALITY-UNCONFIRMED', localityConfirmed:false });
assert.equal(result.validation.valid, true);
assert.equal(result.selection.include, false);
assert.equal(result.productionEligible, false);

// retention boundaries (checkedAt 2026-09-27 UTC)
for (const [date, state, selected] of [
  ['2026-07-29T12:00:00Z','active_60d',true],
  ['2026-07-28T12:00:00Z','inactive_61_90d',false],
  ['2026-06-29T12:00:00Z','inactive_61_90d',false],
  ['2026-06-28T12:00:00Z','expired_over_90d',false],
]) {
  const x = build({
    sourceEventId:`TOKYO-RETENTION-${date.slice(0,10)}`,
    occurredAt:date,
    publishedAt:date
  });
  assert.equal(x.selection.retention.state, state, date);
  assert.equal(x.selection.include, selected, date);
  assert.equal(x.productionEligible, selected, date);
}

// child safety official category without relying on body keywords
result = build({
  sourceEventId:'TOKYO-CHILD',
  sourceCategory:'子供に対する犯罪等',
  headline:'地域安全情報',
  body:'公的配信本文。'
});
assert.equal(result.selection.include,true);
assert.equal(result.selection.priority,'high');
assert.equal(result.selection.topic,'CHILD_SAFETY');

// approach
result = build({
  sourceEventId:'TOKYO-APPROACH',
  sourceCategory:'声かけ等',
  headline:'女性への声かけ',
  body:'帰宅途中の女性への声かけ事案。'
});
assert.equal(result.selection.include,true);
assert.equal(result.selection.topic,'PERSON_SAFETY');

// special fraud
result = build({
  sourceEventId:'TOKYO-FRAUD',
  sourceCategory:'特殊詐欺犯人からの架電情報',
  headline:'警察署からの注意情報',
  body:'地域内で特殊詐欺の電話が確認された。'
});
assert.equal(result.selection.include,true);
assert.equal(result.selection.priority,'high');
assert.equal(result.selection.topic,'FRAUD_LOCAL');

// highway wrong-way
result = build({
  sourceEventId:'TOKYO-WRONG-WAY',
  sourceCategory:'交通情報',
  municipality:'江東区',
  headline:'首都高速で逆走車を確認、通行規制',
  body:'首都高速道路で逆走車が確認され、通行規制が実施された。',
  localityType:'impact'
});
assert.equal(result.selection.include,true);
assert.equal(result.selection.priority,'high');
assert.equal(result.selection.topic,'TRAFFIC_WRONG_WAY');

// ordinary traffic information
result = build({
  sourceEventId:'TOKYO-TRAFFIC-GENERAL',
  sourceCategory:'交通情報',
  headline:'交通安全のお知らせ',
  body:'交通安全週間のお知らせです。'
});
assert.equal(result.selection.include,false);
assert.equal(result.productionEligible,false);

// ordinary NOTICE
result = build({
  sourceEventId:'TOKYO-NOTICE',
  sourceCategory:'各種イベント情報・お知らせ',
  headline:'防犯イベントのお知らせ',
  body:'イベント開催のお知らせです。'
});
assert.equal(result.selection.include,false);
assert.equal(result.productionEligible,false);

// generic safety-information PR without a concrete incident
result = build({
  sourceEventId:'TOKYO-SAFETY-PR',
  sourceCategory:'防犯情報',
  headline:'防犯キャンペーンのお知らせ',
  body:'防犯キャンペーンを開催します。'
});
assert.equal(result.selection.include,false);
assert.equal(result.productionEligible,false);

// local immigration arrest requires official source + locality
result = build({
  sourceEventId:'TOKYO-IMMIGRATION',
  sourceCategory:'その他の犯罪発生情報',
  municipality:'新宿区',
  headline:'出入国管理法違反で新宿区内で逮捕',
  body:'公的機関一次情報として地域内の逮捕を確認。',
  localityType:'arrested'
});
assert.equal(result.candidate.officialSource,true);
assert.equal(result.selection.include,true);
assert.equal(result.selection.topic,'IMMIGRATION_LOCAL_ARREST');

// verified three-row fixture shape
const rows = a.dryRun([
  base,
  {
    ...base,
    sourceEventId:'TOKYO-20260923-002',sourceCategory:'声かけ等',municipality:'八王子市',
    occurredAt:'2026-09-23T23:20:00+09:00',headline:'女性への声かけ',
    body:'廿里町の路上で帰宅途中の女性が男に声をかけられたと警視庁が配信。'
  },
  {
    ...base,
    sourceEventId:'TOKYO-20260923-003',sourceCategory:'公然わいせつ',municipality:'板橋区',
    occurredAt:'2026-09-23T23:50:00+09:00',headline:'公然わいせつ事案',
    body:'本町の路上で男が下半身を露出した事案が発生したと警視庁が配信。'
  }
], { checkedAt });

assert.equal(rows.length, 3);
assert.ok(rows.every(x => x.validation.valid));
assert.ok(rows.every(x => x.validation.publishEligible));
assert.ok(rows.every(x => x.productionEligible));
assert.ok(rows.every(x => x.candidate.source.name === '警視庁 メールけいしちょう OPEN DATA'));

console.log('PASS Keishicho dry-run matrix: current/correction/withdrawn/id/rights/locality/60-91d/categories');
