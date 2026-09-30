import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildScheduleSnapshot,normalizeScheduleRecord,publicationGate} from '../scripts/drive_public_schedule_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/drive/tokyo-public-enforcement-2026-09.json'),'utf8'));
const snapshot=buildScheduleSnapshot(bundle,{mode:'preview'});

assert.equal(snapshot.events.length,9);
assert.equal(snapshot.periodStart,'2026-09-01');
assert.equal(snapshot.periodEnd,'2026-09-30');
assert.match(snapshot.sourceHash,/^[0-9a-f]{64}$/);

const speeding=snapshot.events.find(e=>e.externalId==='speeding');
assert.equal(speeding.enforcementType,'速度違反');
assert.equal(speeding.timePrecision,'POLICY');
assert.equal(speeding.geoPrecision,'PREFECTURE');
assert.equal(speeding.displayMode,'POLICY_ONLY');
assert.equal(speeding.areaText,'幹線道路等');

const school=snapshot.events.find(e=>e.externalId==='school-route-2026-09-30');
assert.equal(school.infoType,'STATEWIDE_DAY');
assert.equal(school.validDate,'2026-09-30');
assert.equal(school.displayMode,'PREFECTURE_DATE');

const drink=snapshot.events.find(e=>e.externalId==='drink-driving');
assert.equal(drink.timeText,'飲酒実態に応じた時間');
assert.equal(drink.areaText,'繁華街周辺、幹線道路、高速道路出入口付近、裏通り等');

assert.equal(snapshot.events.every(e=>e.scheduleChangeNote.includes('断定するものではありません')),true);

const prod=buildScheduleSnapshot(bundle,{mode:'production'});
assert.equal(prod.events.length,0);
assert.deepEqual(prod.gate.reasons,['terms_not_allowed']);
assert.equal(publicationGate(bundle,{mode:'preview'}).publishable,true);

const stale=structuredClone(bundle);stale.source.freshnessStatus='STALE';
assert.equal(buildScheduleSnapshot(stale,{mode:'preview'}).events.length,0);

assert.throws(()=>normalizeScheduleRecord(bundle.source,{...bundle.records[0],infoType:'STATEWIDE_DAY',validDate:null}),/statewide_date_required/);

console.log('PASS: Tokyo monthly public-enforcement normalization contract');
