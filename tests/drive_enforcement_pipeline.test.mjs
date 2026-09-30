import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot,parseClock,normalizeRecord} from '../scripts/drive_enforcement_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/drive/tokyo-wangan-source-v1.json'),'utf8'));

assert.equal(parseClock('24:00'),1440);
assert.equal(parseClock('07:00'),420);
assert.throws(()=>parseClock('24:01'));

const snapshot=buildSnapshot(bundle);
assert.equal(snapshot.events.length,9);
assert.match(snapshot.sourceHash,/^[0-9a-f]{64}$/);
assert.equal(snapshot.events.every(e=>e.freshnessStatus==='CURRENT'),true);
assert.equal(snapshot.events.every(e=>e.infoType==='SPEED_FOCUS'),true);
assert.equal(snapshot.events.every(e=>e.scheduleChangeNote.includes('実際の取締実施中を示すものではありません')),true);

const kan2=snapshot.events.find(e=>e.eventKey.endsWith(':wangan-kan2'));
assert.ok(kan2);
assert.equal(kan2.routeName,'環二通り');
assert.equal(kan2.timeStartMinutes,1200);
assert.equal(kan2.timeEndMinutes,1440);
assert.equal(kan2.geoPrecision,'EXACT_SEGMENT');
assert.equal(kan2.geometryStatus,'ENDPOINTS_VERIFIED');
assert.deepEqual(kan2.routeEndpoints,[[35.642054,139.787168],[35.6352293,139.7926317]]);

const aomi=snapshot.events.find(e=>e.eventKey.endsWith(':wangan-aomi'));
assert.equal(aomi.geometryStatus,'UNRESOLVED');
assert.equal(aomi.routeEndpoints,null);

const stale=structuredClone(bundle);
stale.source.freshnessStatus='STALE';
assert.equal(buildSnapshot(stale).events.length,0,'stale source must fail closed');

const bad=structuredClone(bundle);
bad.records.push({...bad.records[0]});
assert.throws(()=>buildSnapshot(bad),/duplicate_event/);

const multi=normalizeRecord(bundle.source,{
  externalId:'speed-text-test',routeName:'試験路線',speedLimitText:'70・80・100',
  segmentStartText:'始点',segmentEndText:'終点',timeStart:'06:00',timeEnd:'18:00',roadScope:'SEGMENT'
},{});
assert.equal(multi.speedLimitKmh,null);
assert.equal(multi.speedLimitText,'70・80・100');

console.log('PASS: DRIVE enforcement source -> normalized snapshot contract');
