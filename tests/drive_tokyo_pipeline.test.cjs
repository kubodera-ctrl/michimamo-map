const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const fixture=require(path.join(root,'data/drive_sources/tokyo_wangan_speed_guideline.json'));
const pipeline=require(path.join(root,'drive-pipeline/tokyo-wangan-pipeline.cjs'));
const snapshot=require(path.join(root,'drive-beta/data/tokyo-wangan-snapshot.js'));

const normalized=pipeline.normalizeSource(fixture);
assert.equal(normalized.events.length,7,'current Tokyo Wangan official PDF contains seven focus routes');
assert.equal(normalized.sourceId,'tokyo-wangan-speed-guideline');
assert.match(normalized.sourceHash,/^[0-9a-f]{64}$/);

const byRoute=Object.fromEntries(normalized.events.map(x=>[x.routeName,x]));
assert.deepEqual(Object.keys(byRoute),['国道357号','晴海通り','明治通り','三ツ目通り','環二通り','臨港道路','都橋通り']);
assert.equal(byRoute['国道357号'].speedLimitKmh,60);
assert.equal(byRoute['国道357号'].startMinute,360);
assert.equal(byRoute['国道357号'].endMinute,1440);
assert.equal(byRoute['晴海通り'].speedLimitKmh,50);
assert.equal(byRoute['晴海通り'].timeStart,'14:00');
assert.equal(byRoute['明治通り'].timeStart,'12:00');
assert.equal(byRoute['三ツ目通り'].timeStart,'14:00');
assert.equal(byRoute['環二通り'].timeStart,'20:00');
assert.equal(byRoute['環二通り'].timeEnd,'24:00');
assert.equal(byRoute['臨港道路'].alternateSpeedKmh[0],60);
assert.equal(byRoute['都橋通り'].segmentStartText,'東雲1丁目交差点');
assert.equal(byRoute['都橋通り'].segmentEndText,'台場駅前交差点');

const preview=pipeline.publicSnapshot(normalized,{mode:'preview'});
assert.equal(preview.gate.publishable,true);
assert.equal(preview.events.length,7);
const production=pipeline.publicSnapshot(normalized,{mode:'production'});
assert.equal(production.gate.publishable,false);
assert.deepEqual(production.gate.reasons,['terms_not_allowed']);
assert.equal(production.events.length,0);

assert.equal(snapshot.events.length,7);
for(let i=0;i<7;i++){
  const expected=preview.events[i],actual=snapshot.events[i];
  for(const key of ['eventId','routeName','enforcementClass','segmentStartText','segmentEndText','speedLimitKmh','startMinute','endMinute','timeStart','timeEnd']){
    assert.deepEqual(actual[key],expected[key],key+' mismatch at row '+(i+1));
  }
}
assert.equal(snapshot.events.some(x=>/青海縦貫|東京湾岸アンダー/.test(x.routeName)),false,'old non-current rows must never reappear');
assert.equal(snapshot.events.every(x=>x.sourceUrl==='https://www.keishicho.metro.tokyo.lg.jp/sokudo_sisin/1/tokyowangan_sokudo.pdf'),true);

const sourceText=fs.readFileSync(path.join(root,'drive-beta/data/tokyo-wangan-snapshot.js'),'utf8');
assert.doesNotMatch(sourceText,/raw_payload|service_role/i,'browser snapshot must not contain ingestion internals');

assert.throws(()=>pipeline.parseWindow('20-6'),/overnight_window_not_supported/);
assert.throws(()=>pipeline.normalizeRow(fixture.source,{no:8,route:'',kind:'☆',speedText:'50km',start:'x',end:'y',time:'7-9'}),/location_missing/);

console.log('PASS: Tokyo Wangan official-source normalization -> preview snapshot contract');
