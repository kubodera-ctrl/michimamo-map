const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const zones=require(path.join(root,'drive-beta/enforcement-zones.js'));
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/drive/tokyo-wangan-source-v1.json'),'utf8'));
const current=zones.normalizeBundle(bundle);

assert.equal(current.length,9,'Tokyo Wangan current guideline has nine normalized rows');
assert.deepEqual(current.map(z=>z.route),[
  '国道357号','晴海通り','明治通り','三ツ目通り','環二通り','臨港道路',
  '臨港道路(青海縦貫線)','臨港道路(東京湾岸アンダー線)','都橋通り'
]);
const kan2=current.find(z=>z.id==='wangan-kan2');
const r357=current.find(z=>z.id==='wangan-r357');
const miyako=current.find(z=>z.id==='wangan-miyako');
assert.ok(kan2&&r357&&miyako);
assert.equal(zones.isMinuteInWindow(20*60+30,kan2.startMinute,kan2.endMinute),true);
assert.equal(zones.isMinuteInWindow(19*60+59,kan2.startMinute,kan2.endMinute),false);
assert.equal(zones.formatWindow(kan2),'20:00〜24:00');
assert.equal(zones.formatWindow(r357),'06:00〜22:00');
assert.equal(miyako.startLabel,'港区台場1丁目9番先');
assert.equal(miyako.endLabel,'東雲1丁目交差点');
assert.equal(kan2.geometryQuality,'road_routed_beta_candidate');
assert.equal(r357.geometryQuality,'road_routed_beta_candidate');
assert.ok(Array.isArray(kan2.routeEndpoints)&&kan2.routeEndpoints.length===2);
assert.ok(Array.isArray(r357.routeEndpoints)&&r357.routeEndpoints.length===2);
assert.equal(current.filter(z=>Array.isArray(z.routeEndpoints)).length,2,'only candidate endpoint pairs may route in beta');
assert.equal(current.every(z=>z.geometryVerified===false),true,'beta road geometry is not verified yet');
assert.equal(current.every(z=>z.freshnessStatus==='CURRENT'),true);
assert.equal(current.find(z=>z.id==='wangan-aomi').focusType,'METROPOLITAN_AND_STATION_FOCUS');

const stale=structuredClone(bundle);
stale.source.freshnessStatus='STALE';
assert.deepEqual(zones.normalizeBundle(stale),[],'stale source must fail closed');

const segDistance=zones.distanceToPolylineMeters([35.64115,139.7902],[[35.6400,139.7900],[35.6423,139.7904]]);
assert.ok(segDistance<50,'proximity must measure to the road segment, not only vertices');

for(const zone of current){
  assert.equal(zone.agency,'警視庁');
  assert.ok(zone.route&&zone.startLabel&&zone.endLabel&&zone.sourcePdf);
  assert.ok(Number.isInteger(zone.startMinute)&&Number.isInteger(zone.endMinute));
  assert.equal(zone.sourcePdf.includes('/torishimari.files/tokyowangan.pdf'),true);
}

const html=fs.readFileSync(path.join(root,'drive-beta/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'drive-beta/app.js'),'utf8');
assert.match(html,/noindex,nofollow/);
assert.match(html,/実際に現場で取締り・検問を実施中であることを示す表示ではありません/);
assert.match(app,/accident_hotspots_in_view/);
assert.match(app,/watchPosition/);
assert.match(app,/router\.project-osrm\.org\/route\/v1\/driving/);
assert.match(app,/resolvedGeometries/);
assert.match(app,/\/data\/drive\/tokyo-wangan-source-v1\.json/);
assert.match(app,/normalizeBundle/);
assert.doesNotMatch(html,/AED|交番/);
assert.doesNotMatch(app,/検問中/);

assert.match(html,/href="\/drive-beta\/drive\.css"/);
assert.match(html,/src="\/drive-beta\/enforcement-zones\.js"/);
assert.match(html,/src="\/drive-beta\/app\.js"/);
assert.match(html,/id="accidentToggle" aria-pressed="false"/);
assert.match(app,/bindTooltip/);
assert.match(app,/accidentVisible=false/);

console.log('PASS: DRIVE beta current 9-route map contract');
