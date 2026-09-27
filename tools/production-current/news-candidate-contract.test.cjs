'use strict';

const assert = require('node:assert/strict');
const c = require('./news-candidate-contract.cjs');

const good = {
  service: 'machimamo',
  schemaVersion: c.CANDIDATE_SCHEMA_VERSION,
  candidateId: 'keishicho-20260924-001',
  sourceEventId: 'TOKYO-20260924-001',
  informationKind: 'POLICE_OFFICIAL',
  headline: '港区で声かけ事案',
  prefecture: '東京都',
  municipality: '港区',
  newsDate: '2026-09-24',
  sourceStatus: 'verified',
  factsStatus: 'verified',
  rightsStatus: 'cleared',
  correctionStatus: 'current',
  verifiedFacts: ['2026年9月24日に警視庁から配信された情報'],
  source: {
    name: '警視庁 メールけいしちょう OPEN DATA',
    url: 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
    publishedAt: '2026-09-24T00:00:00+09:00',
    checkedAt: '2026-09-27T22:00:00+09:00',
    sourceHash: 'a'.repeat(64)
  },
  rights: {
    rightsLevel: 'CC_BY',
    mediaUseMode: 'ATTRIBUTION_REQUIRED',
    commercialUseAllowed: true,
    rightsCheckedAt: '2026-09-27T22:00:00+09:00',
    rightsEvidenceUrl: 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy',
    attributionText: '出典：警視庁「メールけいしちょう」'
  }
};

let result = c.validateCanonicalCandidate(good);
assert.equal(result.valid, true);
assert.equal(result.publishEligible, true);

result = c.validateCanonicalCandidate({ ...good, correctionStatus: 'unknown' });
assert.equal(result.valid, true);
assert.equal(result.publishEligible, false);

result = c.validateCanonicalCandidate({
  ...good,
  rights: { ...good.rights, commercialUseAllowed: false }
});
assert.equal(result.valid, false);
assert.equal(result.publishEligible, false);

result = c.validateCanonicalCandidate({ ...good, sourceStatus: 'stale' });
assert.equal(result.valid, true);
assert.equal(result.publishEligible, false);

result = c.validateCanonicalCandidate({ ...good, sourceEventId: '' });
assert.equal(result.valid, false, 'missing sourceEventId must fail for police official');
assert.equal(result.publishEligible, false);

result = c.validateCanonicalCandidate({ ...good, informationKind: 'LEGACY_UNVERIFIED' });
assert.equal(result.valid, false);
assert.equal(result.publishEligible, false);

console.log('PASS canonical news candidate contract: source/facts/rights/correction publish gates');
