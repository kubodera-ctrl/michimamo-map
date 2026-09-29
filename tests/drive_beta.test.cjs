const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const zones=require(path.join(root,'drive-beta/enforcement-zones.js'));

assert.equal(zones.TOKYO_WANGAN_ZONES.length,9,'Tokyo Wangan current guideline has nine focus rows');
const kan2=zones.TOKYO_WANGAN_ZONES.find(z=>z.id==='wangan-kan2');
const r357=zones.TOKYO_WANGAN_ZONES.find(z=>z.id==='wangan-r357');
const miyako=zones.TOKYO_WANGAN_ZONES.find(z=>z.id==='wangan-miyako');
assert.ok(kan2&&r357&&miyako);
assert.equal(zones.isMinuteInWindow(20*60+30,kan2.startMinute,kan2.endMinute),true);
assert.equal(zones.isMinuteInWindow(19*60+59,kan2.startMinute,kan2.endMinute),false);
assert.equal(zones.formatWindow(kan2),'20:00〜24:00');
assert.equal(zones.formatWindow(r357),'06:00〜22:00');
assert.equal(miyako.startLabel,'港区台場1丁目9番先');
assert.equal(miyako.endLabel,'東雲1丁目交差点');
assert.equal(kan2.geometryQuality,'road_routed_beta');
assert.equal(r357.geometryQuality,'road_routed_beta');
assert.ok(Array.isArray(kan2.routeEndpoints)&&kan2.routeEndpoints.length===2);
assert.ok(Array.isArray(r357.routeEndpoints)&&r357.routeEndpoints.length===2);
assert.ok(zones.TOKYO_WANGAN_ZONES.every(z=>!Object.hasOwn(z,'geometry')),'guessed static geometry must not ship');
const segDistance=zones.distanceToPolylineMeters([35.64115,139.7902],[[35.6400,139.7900],[35.6423,139.7904]]);
assert.ok(segDistance<50,'proximity must measure to the road segment, not only vertices');

for(const zone of zones.TOKYO_WANGAN_ZONES){
  assert.equal(zone.agency,'警視庁');
  assert.ok(zone.route&&zone.startLabel&&zone.endLabel&&zone.sourcePdf);
  assert.ok(Number.isInteger(zone.startMinute)&&Number.isInteger(zone.endMinute));
}
const html=fs.readFileSync(path.join(root,'drive-beta/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'drive-beta/app.js'),'utf8');
assert.match(html,/noindex,nofollow/);
assert.match(html,/実際に現場で取締り・検問を実施中であることを示す表示ではありません/);
assert.match(app,/accident_hotspots_in_view/);
assert.match(app,/watchPosition/);
assert.match(app,/router\.project-osrm\.org\/route\/v1\/driving/);
assert.match(app,/resolvedGeometries/);
assert.doesNotMatch(html,/AED|交番/);
assert.doesNotMatch(app,/検問中/);

assert.match(html,/href="\/drive-beta\/drive\.css"/);
assert.match(html,/src="\/drive-beta\/enforcement-zones\.js"/);
assert.match(html,/src="\/drive-beta\/app\.js"/);
assert.match(html,/id="accidentToggle" aria-pressed="false"/);
assert.match(app,/bindTooltip/);
assert.match(app,/accidentVisible=false/);

console.log('drive beta static contract: PASS');
