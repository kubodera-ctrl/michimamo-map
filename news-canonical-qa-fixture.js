(function exposeMachimamoCanonicalQaFixtures(root, factory) {
  'use strict';
  const fixtures = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = fixtures;
  if (root) root.MachimamoCanonicalQaFixtures = fixtures;
})(typeof window !== 'undefined' ? window : globalThis, function createCanonicalQaFixtures() {
  'use strict';

  const common = {
    service: 'machimamo',
    schemaVersion: 'machimamo-news-candidate-v1',
    informationKind: 'POLICE_OFFICIAL',
    officialSource: true,
    prefecture: '東京都',
    newsDate: '2026-09-23',
    sourceStatus: 'verified',
    factsStatus: 'verified',
    rightsStatus: 'cleared',
    correctionStatus: 'current',
    rightsScopeConfirmed: true,
    publishEligible: true,
    productionEligible: true,
    fixtureOnly: true,
    source: {
      name: '警視庁 メールけいしちょう OPEN DATA',
      url: 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
      publishedAt: '2026-09-24T00:00:00+09:00',
      checkedAt: '2026-09-27T14:30:00Z'
    },
    rights: {
      rightsLevel: 'CC_BY',
      mediaUseMode: 'ATTRIBUTION_REQUIRED',
      commercialUseAllowed: true,
      modificationAllowed: true,
      attributionRequired: true,
      attributionText: '出典：警視庁「メールけいしちょう」',
      rightsCheckedAt: '2026-09-27T14:30:00Z',
      rightsEvidenceUrl: 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy'
    }
  };

  function item(values) {
    return Object.freeze({
      ...common,
      ...values,
      source: Object.freeze({...common.source, sourceHash: values.sourceHash}),
      rights: Object.freeze({...common.rights}),
      localityEvidence: Object.freeze({
        type: 'occurred',
        confirmed: true,
        prefecture: '東京都',
        municipality: values.municipality,
        evidence: '警視庁OPEN DATAの地域情報'
      }),
      selection: Object.freeze({
        include: true,
        priority: 'high',
        topic: values.topic,
        reason: values.reason,
        retention: Object.freeze({active:true,display:true,ageDays:5,state:'active_60d',label:'active（5日）'})
      })
    });
  }

  return Object.freeze([
    item({
      candidateId:'keishicho-open-data:TOKYO-20260923-001',
      sourceEventId:'TOKYO-20260923-001',
      municipality:'練馬区',
      headline:'中学生女性へのつきまとい',
      category:'APPROACH_OR_SUSPICIOUS',
      verifiedFacts:Object.freeze([
        '平和台2丁目の路上で中学生女性へのつきまとい事案が配信された',
        '警視庁OPEN DATAの検証用fixture'
      ]),
      sourceHash:'7513ab866eb6495949488478613da013b9bf39bdd114a7ce47fb04b0af7b8eb1',
      topic:'CHILD_SAFETY',
      reason:'子ども・捜索・保護に関する地域安全情報'
    }),
    item({
      candidateId:'keishicho-open-data:TOKYO-20260923-002',
      sourceEventId:'TOKYO-20260923-002',
      municipality:'八王子市',
      headline:'女性への声かけ',
      category:'APPROACH_OR_SUSPICIOUS',
      verifiedFacts:Object.freeze([
        '廿里町の路上で帰宅途中の女性への声かけ事案が配信された',
        '警視庁OPEN DATAの検証用fixture'
      ]),
      sourceHash:'a872914a91b6035cb0bd57c4cff70f1975235c0fe02bfd16352ea985d7d1d2bc',
      topic:'PERSON_SAFETY',
      reason:'対人安全に関する地域事案'
    }),
    item({
      candidateId:'keishicho-open-data:TOKYO-20260923-003',
      sourceEventId:'TOKYO-20260923-003',
      municipality:'板橋区',
      headline:'公然わいせつ事案',
      category:'INDECENT_EXPOSURE',
      verifiedFacts:Object.freeze([
        '本町の路上で公然わいせつ事案が配信された',
        '警視庁OPEN DATAの検証用fixture'
      ]),
      sourceHash:'37a830a47395a2f67cf9fa535f8aa855fb5413aee930860930f41804380c537d',
      topic:'PERSON_SAFETY',
      reason:'対人安全に関する地域事案'
    })
  ]);
});
