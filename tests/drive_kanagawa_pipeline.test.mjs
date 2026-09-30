import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot} from '../scripts/drive_enforcement_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'data/drive',name),'utf8'));

const takatsu=load('kanagawa-takatsu-speed-guideline-v1.json');
const takatsuSnapshot=buildSnapshot(takatsu,{mode:'preview'});
assert.equal(takatsuSnapshot.events.length,4);
assert.equal(takatsuSnapshot.events.every(e=>e.prefectureCode==='14'),true);
assert.equal(takatsuSnapshot.events.every(e=>e.geoPrecision==='EXACT_SEGMENT'),true);
assert.equal(takatsuSnapshot.events.every(e=>e.displayMode==='EXACT_SEGMENT_TIMED'),true);
assert.equal(takatsuSnapshot.events.every(e=>e.timeStartMinutes===420&&e.timeEndMinutes===1080),true);

const r246=takatsuSnapshot.events.find(e=>e.externalId==='takatsu-r246');
assert.equal(r246.routeName,'国道246号');
assert.equal(r246.segmentStartText,'槍ケ崎側道側');
assert.equal(r246.segmentEndText,'梶ケ谷交差点');
assert.equal(r246.speedLimitKmh,60);

const tama=takatsuSnapshot.events.find(e=>e.externalId==='takatsu-tama-ensen');
assert.equal(tama.segmentStartText,'二子橋交差点');
assert.equal(tama.segmentEndText,'宇奈根交差点');
assert.equal(tama.speedLimitKmh,40);

const kanagawa=load('kanagawa-kanagawa-speed-guideline-v1.json');
const areaSnapshot=buildSnapshot(kanagawa,{mode:'preview'});
assert.equal(areaSnapshot.events.length,6);
assert.equal(areaSnapshot.events.every(e=>e.geoPrecision==='ROAD_AREA'),true);
assert.equal(areaSnapshot.events.every(e=>e.displayMode==='ROAD_AREA_TIMED'),true);
assert.equal(areaSnapshot.events.every(e=>e.segmentStartText===null&&e.segmentEndText===null),true);

const kamiasao=areaSnapshot.events.filter(e=>e.sourceRecordKey==='row-1');
assert.equal(kamiasao.length,2,'one official row with two focus windows becomes two events');
assert.deepEqual(kamiasao.map(e=>[e.timeStartMinutes,e.timeEndMinutes]),[[420,600],[960,1200]]);
assert.equal(kamiasao.every(e=>e.routeName==='横浜上麻生'&&e.areaText==='六角橋付近'),true);

const ikuta=areaSnapshot.events.filter(e=>e.sourceRecordKey==='row-2');
assert.deepEqual(ikuta.map(e=>[e.timeStartMinutes,e.timeEndMinutes]),[[480,720],[960,1080]]);
assert.equal(ikuta.every(e=>e.areaText==='三枚町付近'),true);

const kan2=areaSnapshot.events.filter(e=>e.sourceRecordKey==='row-3');
assert.deepEqual(kan2.map(e=>[e.timeStartMinutes,e.timeEndMinutes]),[[480,600],[960,1080]]);
assert.equal(kan2.every(e=>e.routeName==='環状2号'&&e.areaText==='羽沢南付近'),true);
assert.equal(kan2.every(e=>e.speedLimitKmh===60),true);

assert.equal(buildSnapshot(takatsu,{mode:'production'}).events.length,0);
assert.equal(buildSnapshot(kanagawa,{mode:'production'}).events.length,0);

console.log('PASS: Kanagawa HTML exact/area multi-window speed-guideline contract');
