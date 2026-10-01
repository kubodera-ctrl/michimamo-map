import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot} from '../scripts/drive_enforcement_pipeline.mjs';
import {buildFocusSnapshot,normalizeFocusRecord} from '../scripts/drive_focus_area_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const load=name=>JSON.parse(fs.readFileSync(path.join(root,'data/drive',name),'utf8'));

const speed=load('saitama-speed-priority-2026-03.json');
const speedSnapshot=buildSnapshot(speed,{mode:'preview'});
assert.equal(speedSnapshot.events.length,4);
assert.equal(speedSnapshot.events.every(e=>e.prefectureCode==='11'),true);
assert.equal(speedSnapshot.events.every(e=>e.geoPrecision==='ROAD_AREA'),true);
assert.equal(speedSnapshot.events.every(e=>e.displayMode==='ROAD_AREA_TIMED'),true);

const urawa= speedSnapshot.events.filter(e=>e.sourceRecordKey==='urawa-row');
assert.equal(urawa.length,2);
assert.deepEqual(urawa.map(e=>[e.routeName,e.timeStartMinutes,e.timeEndMinutes,e.speedLimitKmh]),[
  ['市道',420,540,30],
  ['国道463号',960,1140,40]
]);

const hanno=speedSnapshot.events.filter(e=>e.sourceRecordKey==='hanno-row');
assert.equal(hanno.length,2);
assert.deepEqual(hanno.map(e=>[e.timeStartMinutes,e.timeEndMinutes]),[[360,540],[1230,1410]]);
assert.equal(hanno.every(e=>e.areaText==='飯能市大字飯能から飯能市大字坂元まで'),true);

const focus=load('saitama-urawa-focus-areas-v1.json');
const focusSnapshot=buildFocusSnapshot(focus,{mode:'preview'});
assert.equal(focusSnapshot.events.length,4);
assert.equal(focusSnapshot.events.every(e=>e.prefectureCode==='11'),true);
assert.equal(focusSnapshot.events.every(e=>e.displayMode==='AREA_FOCUS'),true);

const intersections=focusSnapshot.events.filter(e=>e.infoType==='INTERSECTION_FOCUS');
assert.equal(intersections.length,2);
assert.deepEqual(intersections.map(e=>[e.timeStartMinutes,e.timeEndMinutes]),[[360,510],[1050,1140]]);
assert.equal(intersections.every(e=>e.localityText==='浦和駅西口・武蔵浦和駅周辺'),true);

const drink=focusSnapshot.events.find(e=>e.infoType==='DRINK_FOCUS');
assert.equal(drink.timePrecision,'POLICY');
assert.equal(drink.timeStartMinutes,null);
assert.equal(drink.timeEndMinutes,null);
assert.equal(drink.timeText,'飲酒実態に応じた時間');
assert.equal(drink.localityText,'武蔵浦和駅付近・田島団地通り');

const school=focusSnapshot.events.find(e=>e.infoType==='SCHOOL_ROUTE_FOCUS');
assert.equal(school.timePrecision,'DAYPART');
assert.equal(school.timeText,'児童・生徒等の登下校の時間帯');
assert.match(school.localityText,/仲町小学校/);

assert.equal(buildSnapshot(speed,{mode:'production'}).events.length,0);
assert.equal(buildFocusSnapshot(focus,{mode:'production'}).events.length,0);
assert.equal(focusSnapshot.events.every(e=>e.scheduleChangeNote.includes('現在の取締実施や検問位置を示すものではありません')),true);

assert.throws(()=>normalizeFocusRecord(focus.source,{
  externalId:'bad',sourceRecordKey:'x',infoType:'DRINK_FOCUS',enforcementType:'飲酒運転',
  localityText:'駅周辺',timePrecision:'POLICY',timeText:'',geoPrecision:'LOCALITY',displayMode:'AREA_FOCUS'
}),/focus_time_text_required/);

console.log('PASS: Saitama speed + official focus-area contract');
