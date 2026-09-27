'use strict';
const assert = require('node:assert/strict');
const { validateProductionInput } = require('./input-contract.cjs');

const rights = { rightsLevel: 'PUBLIC_LICENSE', mediaUseMode: 'STILL_ONLY', commercialUseAllowed: true };
const source = { name: '警察公式', url: 'https://www.example.jp/news', publishedAt: '2026-09-27' };
const single = {
  mode: 'SINGLE', sourceType: 'POLICE_OFFICIAL', source, rights,
  single: { prefecture: '東京都', municipality: '千代田区', category: 'safety', headline: '公式発表の見出し', verifiedFacts: ['公式発表に記載された事実'] }
};
assert.equal(validateProductionInput(single).publishEligible, true);

const anomaly = structuredClone(single);
anomaly.sourceType = 'LOCAL_ANOMALY';
anomaly.source = { name: 'まちまも地域投稿', url: null, publishedAt: '2026-09-27' };
assert.equal(validateProductionInput(anomaly).publishEligible, true);
assert.notEqual(anomaly.sourceType, single.sourceType, 'user anomaly and police source remain distinct');

for (const invalidType of ['official', 'police_station', 'FIRE_OFFICIAL', null]) {
  assert.equal(validateProductionInput({ ...single, sourceType: invalidType }).publishEligible, false);
}
assert.equal(validateProductionInput({ ...single, source: { ...source, url: 'http://example.jp' } }).publishEligible, false);
assert.equal(validateProductionInput({ ...single, source: { name: '警察公式', url: null, publishedAt: '2026-09-27' } }).publishEligible, false);
assert.equal(validateProductionInput({ ...single, rights: { ...rights, rightsLevel: 'REVIEW' } }).publishEligible, false);
assert.equal(validateProductionInput({ ...single, rights: { ...rights, mediaUseMode: 'DO_NOT_USE' } }).publishEligible, false);
assert.equal(validateProductionInput({ ...single, single: { ...single.single, verifiedFacts: [] } }).publishEligible, false);

const weekly = {
  mode: 'WEEKLY', source, rights,
  weekly: { prefecture: '東京都', periodLabel: '2026年9月第4週', newsItems: [
    { municipality: '千代田区', headline: '公式ニュース', verifiedFacts: ['確認済み事実'], sourceType: 'POLICE_OFFICIAL', source, rights }
  ], safetyPoints: ['周囲の状況を確認する'] }
};
assert.equal(validateProductionInput(weekly).publishEligible, true);
const mixedWeekly = structuredClone(weekly);
mixedWeekly.weekly.newsItems.push({ municipality: '港区', headline: '地域の異変', verifiedFacts: ['投稿情報'], sourceType: 'LOCAL_ANOMALY', source: { name: 'まちまも地域投稿', url: null, publishedAt: '2026-09-27' }, rights });
assert.equal(validateProductionInput(mixedWeekly).publishEligible, true, 'weekly items keep their own source types and rights');
assert.equal(validateProductionInput({ ...weekly, weekly: { ...weekly.weekly, newsItems: [] } }).publishEligible, false);
assert.equal(validateProductionInput({ ...weekly, weekly: { ...weekly.weekly, newsItems: [{ municipality: '千代田区', headline: '見出し', verifiedFacts: [] }] } }).publishEligible, false);
console.log('PASS CURRENT input provenance, sourceType separation, facts and rights publish gates');
