import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coverageWeaknessReasons,
  rankCoverageGaps,
  rankWeakPrefectureCoverage,
  summarizePrefectureCoverage,
  type CoverageEvent,
  type CoverageSource
} from '../../shared/machiibe-ingestion/coverage';

const sources:CoverageSource[]=[
  {sourceId:'a',prefecture:'東京都',reviewState:'ACTIVE',failureCount:1,observedCurrentItemsMin:12,lane:'regional'},
  {sourceId:'b',prefecture:'東京都',reviewState:'READY',failureCount:0,observedCurrentItemsMin:5,lane:'facility'},
  {sourceId:'e',prefecture:'東京都',reviewState:'PREFLIGHT',failureCount:0,observedCurrentItemsMin:3,lane:'oshi'},
  {sourceId:'c',prefecture:'鳥取県',reviewState:'TERMS_REVIEWED',failureCount:2,observedCurrentItemsMin:20,lane:'open_data'},
  {sourceId:'d',prefecture:'沖縄県',reviewState:'PREFLIGHT',failureCount:0,observedCurrentItemsMin:null,lane:'regional'}
];

const events:CoverageEvent[]=[
  {eventId:'e1',prefecture:'東京都',startDate:'2026-09-29',endDate:'2026-09-29',status:'scheduled',imageUsable:true,sourceIds:['a','b']},
  {eventId:'e2',prefecture:'東京都',startDate:'2026-10-10',endDate:'2026-10-10',status:'changed',imageUsable:false,sourceIds:['a']},
  {eventId:'e3',prefecture:'鳥取県',startDate:'2026-09-01',endDate:'2026-09-20',status:'scheduled',imageUsable:false,sourceIds:['c']},
  {eventId:'e4',prefecture:'沖縄県',startDate:'2026-10-01',endDate:'2026-10-02',status:'cancelled',imageUsable:true,sourceIds:['d']}
];

test('coverage summary separates source readiness, live events, images and dedup',()=>{
  const rows=summarizePrefectureCoverage(['東京都','鳥取県','沖縄県'],sources,events,'2026-09-29');
  const tokyo=rows[0];
  assert.deepEqual(tokyo,{
    prefecture:'東京都',
    candidateSources:3,
    readySources:2,
    activeSources:1,
    activeEvents:2,
    next30DaysEvents:2,
    imageUsableEvents:1,
    imageMissingEvents:1,
    sourceFailures:1,
    duplicateMerged:1,
    observedPotentialEventsMin:20,
    facilitySources:1,
    oshiSources:1
  });
  assert.equal(rows[1].activeEvents,0);
  assert.equal(rows[1].sourceFailures,2);
  assert.equal(rows[2].activeEvents,0);
});

test('coverage gap ranking prioritizes zero-event prefectures before dense areas',()=>{
  const rows=summarizePrefectureCoverage(['東京都','鳥取県','沖縄県'],sources,events,'2026-09-29');
  const ranked=rankCoverageGaps(rows);
  assert.deepEqual(ranked.slice(0,2).map((row)=>row.prefecture),['沖縄県','鳥取県']);
  assert.equal(ranked[2].prefecture,'東京都');
});


test('research yield stays separate from active event counts',()=>{
  const rows=summarizePrefectureCoverage(['鳥取県'],sources,events,'2026-09-29');
  assert.equal(rows[0].activeEvents,0);
  assert.equal(rows[0].observedPotentialEventsMin,20);
});


test('weak-prefecture detector catches thin supply after candidate coverage exists',()=>{
  const rows=summarizePrefectureCoverage(['東京都','鳥取県','沖縄県'],sources,events,'2026-09-29');
  assert.deepEqual(coverageWeaknessReasons(rows[0]),[]);
  assert.ok(coverageWeaknessReasons(rows[1]).includes('single_source'));
  assert.ok(coverageWeaknessReasons(rows[1]).includes('no_ready_source'));
  assert.ok(coverageWeaknessReasons(rows[1]).includes('facility_gap'));
  assert.ok(coverageWeaknessReasons(rows[1]).includes('oshi_gap'));
  const ranked=rankWeakPrefectureCoverage(rows);
  assert.equal(ranked[0].prefecture,'沖縄県');
});
