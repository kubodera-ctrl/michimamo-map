'use strict';

const assert = require('node:assert/strict');
const a = require('./keishicho-open-data-adapter.cjs');

const checkedAt = new Date('2026-09-27T14:30:00Z');
const record = {
  sourceEventId: 'TOKYO-20260923-001',
  sourceCategory: '声かけ等',
  municipality: '練馬区',
  occurredAt: '2026-09-23T22:00:00+09:00',
  publishedAt: '2026-09-24T00:00:00+09:00',
  headline: '中学生女性へのつきまとい',
  body: '平和台2丁目の路上で中学生女性が不審な者につきまとわれたと警視庁が配信。',
  correctionStatus: 'current',
  localityType: 'occurred',
  localityConfirmed: true
};

let result = a.buildCanonicalCandidate(record, { checkedAt });
assert.equal(result.validation.valid, true);
assert.equal(result.validation.publishEligible, true);
assert.equal(result.candidate.sourceEventId, 'TOKYO-20260923-001');
assert.equal(result.candidate.candidateId, 'keishicho-open-data:TOKYO-20260923-001');
assert.equal(result.candidate.prefecture, '東京都');
assert.equal(result.candidate.municipality, '練馬区');
assert.equal(result.candidate.category, 'APPROACH_OR_SUSPICIOUS');
assert.equal(result.candidate.rights.rightsLevel, 'CC_BY');
assert.equal(result.candidate.rights.attributionText, '出典：警視庁「メールけいしちょう」');
assert.equal(result.candidate.correctionStatus, 'current');
assert.match(result.candidate.source.sourceHash, /^[0-9a-f]{64}$/);
assert.equal(result.selection.include, true);
assert.equal(result.selection.priority, 'high');
assert.equal(result.selection.topic, 'CHILD_SAFETY');

const changed = a.buildCanonicalCandidate({ ...record, body: record.body + ' 訂正あり。' }, { checkedAt });
assert.notEqual(changed.candidate.source.sourceHash, result.candidate.source.sourceHash, 'source correction must change hash');

result = a.buildCanonicalCandidate({ ...record, correctionStatus:'withdrawn' }, { checkedAt });
assert.equal(result.validation.valid, true);
assert.equal(result.validation.publishEligible, false);

result = a.buildCanonicalCandidate({ ...record, sourceEventId:'' }, { checkedAt });
assert.equal(result.validation.valid, false);
assert.equal(result.validation.publishEligible, false);

const rows = a.dryRun([
  record,
  {
    sourceEventId:'TOKYO-20260923-002',sourceCategory:'声かけ等',municipality:'八王子市',
    occurredAt:'2026-09-23T23:20:00+09:00',publishedAt:'2026-09-24T00:00:00+09:00',
    headline:'女性への声かけ',body:'廿里町の路上で帰宅途中の女性が男に声をかけられたと警視庁が配信。',
    correctionStatus:'current'
  },
  {
    sourceEventId:'TOKYO-20260923-003',sourceCategory:'公然わいせつ',municipality:'板橋区',
    occurredAt:'2026-09-23T23:50:00+09:00',publishedAt:'2026-09-24T00:00:00+09:00',
    headline:'公然わいせつ事案',body:'本町の路上で男が下半身を露出した事案が発生したと警視庁が配信。',
    correctionStatus:'current'
  }
], { checkedAt });

assert.equal(rows.length, 3);
assert.ok(rows.every(x => x.validation.valid));
assert.ok(rows.every(x => x.validation.publishEligible));
assert.ok(rows.every(x => x.candidate.source.name === '警視庁 メールけいしちょう OPEN DATA'));

console.log('PASS Keishicho Open DATA adapter core: canonical mapping, sourceHash, rights, correction, locality, selection');
