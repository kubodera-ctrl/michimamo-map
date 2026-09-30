import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot} from '../scripts/drive_enforcement_pipeline.mjs';
import {buildScheduleSnapshot} from '../scripts/drive_public_schedule_pipeline.mjs';
import {buildFocusSnapshot} from '../scripts/drive_focus_area_pipeline.mjs';
import {buildDriveStagingSnapshot} from '../scripts/drive_common_event.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'data/drive',name),'utf8'));

const tokyoSpeed=load('tokyo-wangan-source-v1.json');
const tokyoSchedule=load('tokyo-public-enforcement-2026-09.json');
const chiba=load('chiba-urayasu-speed-guideline-v1.json');
const kanagawaTakatsu=load('kanagawa-takatsu-speed-guideline-v1.json');
const kanagawaArea=load('kanagawa-kanagawa-speed-guideline-v1.json');
const saitamaSpeed=load('saitama-speed-priority-2026-03.json');
const saitamaFocus=load('saitama-urawa-focus-areas-v1.json');

const speedSnapshot=bundle=>buildSnapshot(bundle,{mode:'preview'});
const scheduleSnapshot=buildScheduleSnapshot(tokyoSchedule,{mode:'preview'});
const focusSnapshot=buildFocusSnapshot(saitamaFocus,{mode:'preview'});

const entries=[
  {sourceKey:tokyoSpeed.source.sourceKey,sourceFamily:'SPEED_GUIDELINE',events:speedSnapshot(tokyoSpeed).events},
  {sourceKey:tokyoSchedule.source.sourceKey,sourceFamily:'PUBLIC_SCHEDULE',events:scheduleSnapshot.events},
  {sourceKey:chiba.source.sourceKey,sourceFamily:'SPEED_GUIDELINE',events:speedSnapshot(chiba).events},
  {sourceKey:kanagawaTakatsu.source.sourceKey,sourceFamily:'SPEED_GUIDELINE',events:speedSnapshot(kanagawaTakatsu).events},
  {sourceKey:kanagawaArea.source.sourceKey,sourceFamily:'SPEED_GUIDELINE',events:speedSnapshot(kanagawaArea).events},
  {sourceKey:saitamaSpeed.source.sourceKey,sourceFamily:'SPEED_GUIDELINE',events:speedSnapshot(saitamaSpeed).events},
  {sourceKey:saitamaFocus.source.sourceKey,sourceFamily:'AREA_FOCUS',events:focusSnapshot.events}
];

const staging=buildDriveStagingSnapshot(entries);
assert.equal(staging.schemaName,'drive_common_event_v1');
assert.equal(staging.stage,'PREVIEW_STAGING');
assert.equal(staging.sourceCount,7);
assert.equal(staging.eventCount,41);
assert.deepEqual(staging.prefectureOrder,['13','12','14','11']);
assert.deepEqual(staging.byPrefecture,{'11':8,'12':4,'13':19,'14':10});

assert.equal(new Set(staging.events.map(e=>e.eventKey)).size,41);
assert.equal(staging.events.every(e=>e.freshnessStatus==='CURRENT'),true);
assert.equal(staging.events.some(e=>JSON.stringify(e).includes('termsStatus')),false);
assert.equal(staging.events.some(e=>JSON.stringify(e).includes('parserVersion')),false);

const byFamily=family=>staging.events.filter(e=>e.sourceFamily===family);
assert.equal(byFamily('SPEED_GUIDELINE').length,28);
assert.equal(byFamily('PUBLIC_SCHEDULE').length,9);
assert.equal(byFamily('AREA_FOCUS').length,4);

const geometryCandidates=staging.events.filter(e=>e.geometry.endpointVerified);
assert.equal(geometryCandidates.length,4);
assert.equal(geometryCandidates.every(e=>e.geometry.verified===false),true);
assert.deepEqual(geometryCandidates.map(e=>e.eventKey),[
  'tokyo:tokyo-wangan:speed-guideline:wangan-r357',
  'tokyo:tokyo-wangan:speed-guideline:wangan-meiji',
  'tokyo:tokyo-wangan:speed-guideline:wangan-kan2',
  'tokyo:tokyo-wangan:speed-guideline:wangan-rinko-keihin-chuboh'
]);

const tokyoToday=staging.events.find(e=>e.eventKey==='tokyo:public-enforcement:2026-09:school-route-2026-09-30');
assert.equal(tokyoToday.time.validDate,'2026-09-30');
assert.equal(tokyoToday.location.precision,'PREFECTURE');

const chibaArea=staging.events.find(e=>e.eventKey==='chiba:urayasu:speed-guideline:urayasu-r357');
assert.equal(chibaArea.location.precision,'ROAD_AREA');
assert.equal(chibaArea.location.areaText,'富岡地区');

const kanagawaExact=staging.events.find(e=>e.eventKey==='kanagawa:takatsu:speed-guideline:takatsu-r246');
assert.equal(kanagawaExact.location.precision,'EXACT_SEGMENT');
assert.equal(kanagawaExact.location.segmentEndText,'梶ケ谷交差点');

const saitamaLocality=staging.events.find(e=>e.eventKey==='saitama:focus-areas:urawa:urawa-intersection-am');
assert.equal(saitamaLocality.location.precision,'LOCALITY');
assert.equal(saitamaLocality.time.startMinutes,360);
assert.equal(saitamaLocality.time.endMinutes,510);

assert.throws(()=>buildDriveStagingSnapshot([...entries,entries[0]]),/duplicate_staging_source/);

console.log('PASS: Tokyo -> Chiba -> Kanagawa -> Saitama common-schema staging E2E (7 sources / 41 events)');
