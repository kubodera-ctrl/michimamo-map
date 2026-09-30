import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSnapshot,parseClock,parseSpeed,normalizeRecord,publicationGate} from '../scripts/drive_enforcement_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/drive/tokyo-wangan-source-v1.json'),'utf8'));

assert.equal(parseClock('24:00'),1440);
assert.equal(parseClock('07:00'),420);
assert.throws(()=>parseClock('24:01'));
assert.deepEqual(parseSpeed('50（東京ゲートブリッジ上60）'),{
  speedLimitKmh:50,speedLimitText:'50(東京ゲートブリッジ上60)',alternateSpeedKmh:[60]
});

const snapshot=buildSnapshot(bundle,{mode:'preview'});
assert.equal(snapshot.events.length,7,'current official Tokyo Wangan PDF contains seven focus routes');
assert.match(snapshot.sourceHash,/^[0-9a-f]{64}$/);
assert.equal(snapshot.events.every(e=>e.freshnessStatus==='CURRENT'),true);
assert.equal(snapshot.events.every(e=>e.infoType==='SPEED_FOCUS'),true);
assert.equal(snapshot.events.every(e=>e.scheduleChangeNote.includes('実際の取締実施中を示すものではありません')),true);
assert.deepEqual(snapshot.events.map(e=>e.routeName),[
  '国道357号','晴海通り','明治通り','三ツ目通り','環二通り','臨港道路','都橋通り'
]);

const r357=snapshot.events.find(e=>e.eventKey.endsWith(':wangan-r357'));
assert.equal(r357.timeStartMinutes,360);
assert.equal(r357.timeEndMinutes,1440);
assert.equal(r357.speedLimitKmh,60);

const kan2=snapshot.events.find(e=>e.eventKey.endsWith(':wangan-kan2'));
assert.ok(kan2);
assert.equal(kan2.routeName,'環二通り');
assert.equal(kan2.timeStartMinutes,1200);
assert.equal(kan2.timeEndMinutes,1440);
assert.equal(kan2.geoPrecision,'EXACT_SEGMENT');
assert.equal(kan2.geometryStatus,'ENDPOINTS_CANDIDATE');
assert.equal(kan2.geometryVerified,false);
assert.deepEqual(kan2.routeEndpoints,[[35.642054,139.787168],[35.6352293,139.7926317]]);

const rinko=snapshot.events.find(e=>e.eventKey.endsWith(':wangan-rinko'));
assert.equal(rinko.speedLimitKmh,50);
assert.deepEqual(rinko.alternateSpeedKmh,[60]);
assert.equal(rinko.segmentStartText,'京浜大橋北交差点');
assert.equal(rinko.segmentEndText,'中央防波堤交差点');

const miyako=snapshot.events.find(e=>e.eventKey.endsWith(':wangan-miyako'));
assert.equal(miyako.segmentStartText,'東雲1丁目交差点');
assert.equal(miyako.segmentEndText,'台場駅前交差点');
assert.equal(miyako.focusType,'STATION_FOCUS');

assert.equal(snapshot.events.some(e=>/青海縦貫|東京湾岸アンダー/.test(e.routeName)),false,'old mixed-in rows must not reappear');

const prod=buildSnapshot(bundle,{mode:'production'});
assert.equal(prod.events.length,0,'production publication must remain closed while terms are pending');
assert.deepEqual(prod.gate.reasons,['terms_not_allowed']);
assert.equal(publicationGate(bundle,{mode:'preview'}).publishable,true);

const stale=structuredClone(bundle);
stale.source.freshnessStatus='STALE';
assert.equal(buildSnapshot(stale,{mode:'preview'}).events.length,0,'stale source must fail closed');

const bad=structuredClone(bundle);
bad.records.push({...bad.records[0]});
assert.throws(()=>buildSnapshot(bad,{mode:'preview'}),/duplicate_event/);

const multi=normalizeRecord(bundle.source,{
  externalId:'speed-text-test',routeName:'試験路線',focusType:'METROPOLITAN_FOCUS',
  speedLimitText:'70・80・100',segmentStartText:'始点',segmentEndText:'終点',
  timeStart:'06:00',timeEnd:'18:00',roadScope:'SEGMENT'
},{});
assert.equal(multi.speedLimitKmh,70);
assert.deepEqual(multi.alternateSpeedKmh,[80,100]);

console.log('PASS: DRIVE official source -> normalized preview snapshot contract');
