'use strict';

const assert = require('node:assert/strict');
const adapter = require('../news-candidate-adapter.js');

const row = {
  id: 2051,
  created_at: '2026-09-19T06:15:30.3937Z',
  category: 'official',
  title: '【防犯ニュース】（福岡）みやこ町国分付近で声かけ ９月１８日 - ｄメニューニュース',
  comment: '（福岡）みやこ町国分付近で声かけ ９月１８日',
  address: 'みやこ町',
  is_hidden: false,
  report_count: 0
};

const candidate = adapter.normalizeLegacySpot(row);
assert.equal(candidate.informationKind, 'LEGACY_UNVERIFIED');
assert.equal(candidate.prefecture, '福岡県');
assert.equal(candidate.municipality, 'みやこ町');
assert.equal(candidate.newsDate, '2026-09-18');
assert.equal(candidate.publishEligible, false);
assert.equal(candidate.sourceStatus, 'needs_review');
assert.equal(candidate.factsStatus, 'needs_review');
assert.equal(candidate.rightsStatus, 'needs_review');
assert.equal(candidate.legacyComment, row.comment);
assert.equal(candidate.legacyAddress, row.address);

assert.equal(adapter.normalizeLegacySpot({ ...row, category: 'local_anomaly' }), null);
assert.equal(adapter.isoWeekStart('2026-W38'), '2026-09-14');
assert.equal(adapter.isoWeekValue(new Date('2026-09-27T12:00:00Z')), '2026-W39');

const candidates = [
  candidate,
  adapter.normalizeLegacySpot({
    ...row,
    id: 2050,
    title: '【防犯ニュース】（広島）福山市で声かけ ９月１５日',
    comment: '福山市で声かけ ９月１５日',
    address: '福山市',
  })
].filter(Boolean);

assert.equal(adapter.filterCandidates(candidates, { prefecture: '福岡県' }).length, 1);
assert.equal(adapter.filterCandidates(candidates, { informationKind: 'POLICE_OFFICIAL' }).length, 0);

const weekly = adapter.weeklySummary(candidates, {
  weekValue: '2026-W38',
  prefecture: '福岡県',
  requestedCount: 6
});
assert.equal(weekly.candidates.length, 1);
assert.equal(weekly.eligible.length, 0);
assert.equal(weekly.shortage, 6);

console.log('PASS legacy news candidate adapter: inference, date/week filtering, publish gate');

const canonicalWeekly = adapter.weeklySummary([
  {
    candidateId:'canonical-1',
    informationKind:'POLICE_OFFICIAL',
    headline:'首都高速で逆走車を確認',
    prefecture:'東京都',
    municipality:'江東区',
    newsDate:'2026-09-24',
    publishEligible:true,
    productionEligible:true,
    selection:{include:true}
  },
  {
    candidateId:'canonical-2',
    informationKind:'POLICE_OFFICIAL',
    headline:'一般広報',
    prefecture:'東京都',
    municipality:'新宿区',
    newsDate:'2026-09-24',
    publishEligible:true,
    productionEligible:false,
    selection:{include:false}
  }
], {
  weekValue:'2026-W39',
  prefecture:'東京都',
  requestedCount:6
});
assert.equal(canonicalWeekly.candidates.length,2);
assert.equal(canonicalWeekly.eligible.length,1);
assert.equal(canonicalWeekly.shortage,5);
