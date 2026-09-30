import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot} from '../scripts/drive_enforcement_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/drive/chiba-urayasu-speed-guideline-v1.json'),'utf8'));
const snapshot=buildSnapshot(bundle,{mode:'preview'});

assert.equal(snapshot.events.length,4);
assert.equal(snapshot.events.every(e=>e.prefectureCode==='12'),true);
assert.equal(snapshot.events.every(e=>e.geoPrecision==='ROAD_AREA'),true);
assert.equal(snapshot.events.every(e=>e.displayMode==='ROAD_AREA_TIMED'),true);

const r357=snapshot.events.find(e=>e.externalId==='urayasu-r357');
assert.equal(r357.routeName,'国道357号');
assert.equal(r357.areaText,'富岡地区');
assert.equal(r357.timeStartMinutes,360);
assert.equal(r357.timeEndMinutes,1020);
assert.equal(r357.speedLimitKmh,60);
assert.equal(r357.speedLimitKind,'EXACT');

const morning=snapshot.events.find(e=>e.externalId==='urayasu-cityroad-am');
const afternoon=snapshot.events.find(e=>e.externalId==='urayasu-cityroad-pm');
assert.equal(morning.sourceRecordKey,'speed-row-3');
assert.equal(afternoon.sourceRecordKey,'speed-row-3');
assert.equal(morning.speedLimitKmh,null,'30～50 must not be misrepresented as 30');
assert.equal(morning.speedLimitKind,'MULTIPLE_OR_RANGE');
assert.deepEqual(morning.speedLimitValuesKmh,[30,50]);
assert.equal(morning.speedLimitText,'30~50');
assert.equal(morning.timeStartMinutes,480);
assert.equal(morning.timeEndMinutes,540);
assert.equal(afternoon.timeStartMinutes,780);
assert.equal(afternoon.timeEndMinutes,960);

const prod=buildSnapshot(bundle,{mode:'production'});
assert.equal(prod.events.length,0,'terms pending keeps Chiba out of Production');

console.log('PASS: Chiba Urayasu area/multi-window speed-guideline contract');
