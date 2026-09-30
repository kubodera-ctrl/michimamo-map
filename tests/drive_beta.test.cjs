const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const zones=require(path.join(root,'drive-beta/enforcement-zones.js'));
const bundle=JSON.parse(fs.readFileSync(path.join(root,'data/drive/tokyo-wangan-source-v1.json'),'utf8'));
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'drive-beta/data/tokyo-wangan-preview-v1.json'),'utf8'));
const scheduleSnapshot=JSON.parse(fs.readFileSync(path.join(root,'drive-beta/data/tokyo-public-enforcement-2026-09-preview-v1.json'),'utf8'));
const fromSource=zones.normalizeBundle(bundle);
const current=zones.normalizeSnapshot(snapshot);

assert.equal(bundle.records.length,9,'Tokyo Wangan current official PDF has nine source rows');
assert.equal(fromSource.length,10,'segmented Rinko row expands to ten normalized events');
assert.equal(current.length,10,'public preview snapshot must expose ten geometry-safe events');
assert.deepEqual(current.map(x=>x.id),fromSource.map(x=>x.id),'public snapshot IDs must match source normalization');

const kan2=current.find(z=>z.id==='wangan-kan2');
const r357=current.find(z=>z.id==='wangan-r357');
const miyako=current.find(z=>z.id==='wangan-miyako');
const meiji=current.find(z=>z.id==='wangan-meiji');
const harumi=current.find(z=>z.id==='wangan-harumi');
const mitsume=current.find(z=>z.id==='wangan-mitsume');
const rinko50=current.find(z=>z.id==='wangan-rinko-keihin-chuboh');
const rinko60=current.find(z=>z.id==='wangan-rinko-chuboh-shinkiba');
assert.ok(kan2&&r357&&meiji&&harumi&&mitsume&&miyako&&rinko50&&rinko60);
assert.equal(zones.isMinuteInWindow(20*60+30,kan2.startMinute,kan2.endMinute),true);
assert.equal(zones.isMinuteInWindow(19*60+59,kan2.startMinute,kan2.endMinute),false);
assert.equal(zones.formatWindow(kan2),'20:00〜24:00');
assert.equal(zones.formatWindow(r357),'06:00〜22:00');
assert.equal(r357.speedKmh,60);
assert.equal(miyako.startLabel,'港区台場1丁目9番先');
assert.equal(miyako.endLabel,'東雲1丁目交差点');
assert.equal(miyako.focusType,'STATION_FOCUS');
assert.equal(rinko50.speedKmh,50);
assert.equal(rinko60.speedKmh,60);
assert.deepEqual(rinko50.alternateSpeedKmh,[]);
assert.deepEqual(rinko60.alternateSpeedKmh,[]);
assert.equal(rinko50.startLabel,'京浜大橋北交差点');
assert.equal(rinko50.endLabel,'中央防波堤交差点');
assert.equal(rinko60.startLabel,'中央防波堤交差点');
assert.equal(rinko60.endLabel,'新木場交差点');
assert.equal(kan2.geometryQuality,'road_route_endpoint_crosschecked');
assert.equal(r357.geometryQuality,'road_route_endpoint_crosschecked');
assert.equal(kan2.geometryStatus,'ENDPOINTS_CROSSCHECKED');
assert.equal(kan2.endpointVerified,true);
assert.equal(kan2.geometryVerified,false);
assert.equal(r357.endpointVerified,true);
assert.equal(r357.geometryVerified,false);
assert.equal(meiji.endpointVerified,true);
assert.equal(meiji.geometryVerified,false);
assert.equal(harumi.endpointVerified,true);
assert.equal(harumi.geometryVerified,false);
assert.equal(mitsume.endpointVerified,true);
assert.equal(mitsume.geometryVerified,false);
assert.equal(rinko50.endpointVerified,true);
assert.equal(rinko50.geometryVerified,false);
assert.equal(rinko60.endpointVerified,true);
assert.equal(rinko60.geometryVerified,false);
assert.ok(Array.isArray(kan2.routeEndpoints)&&kan2.routeEndpoints.length===2);
assert.ok(Array.isArray(r357.routeEndpoints)&&r357.routeEndpoints.length===2);
assert.ok(Array.isArray(meiji.routeEndpoints)&&meiji.routeEndpoints.length===2);
assert.ok(Array.isArray(harumi.routeEndpoints)&&harumi.routeEndpoints.length===2);
assert.ok(Array.isArray(mitsume.routeEndpoints)&&mitsume.routeEndpoints.length===2);
assert.ok(Array.isArray(rinko50.routeEndpoints)&&rinko50.routeEndpoints.length===2);
assert.ok(Array.isArray(rinko60.routeEndpoints)&&rinko60.routeEndpoints.length===2);
assert.equal(current.filter(z=>Array.isArray(z.routeEndpoints)).length,7,'only cross-checked geometry candidates may route in beta');
assert.equal(current.every(z=>z.freshnessStatus==='CURRENT'),true);
assert.equal(current.some(z=>/青海縦貫/.test(z.route)),true);
assert.equal(current.some(z=>/東京湾岸アンダー/.test(z.route)),true);

const stale=structuredClone(snapshot);
stale.freshnessStatus='STALE';
assert.deepEqual(zones.normalizeSnapshot(stale),[],'stale public snapshot must fail closed');

const segDistance=zones.distanceToPolylineMeters([35.64115,139.7902],[[35.6400,139.7900],[35.6423,139.7904]]);
assert.ok(segDistance<50,'proximity must measure to the road segment, not only vertices');

const osrm357={routes:[{legs:[{steps:[
  {name:'東京湾岸道路',ref:'国道357号'},
  {name:'湾岸道路',ref:'357'}
]}]}]};
const osrmWrong={routes:[{legs:[{steps:[{name:'首都高速湾岸線',ref:'B'}]}]}]};
assert.equal(zones.routeMatchesExpected(osrm357,r357.routeMatchTokens),true,'R357 road signature must match');
assert.equal(zones.routeMatchesExpected(osrmWrong,r357.routeMatchTokens),false,'unrelated road route must fail closed');
const osrmMeiji={routes:[{legs:[{steps:[{name:'明治通り',ref:'東京都道306号'}]}]}]};
const osrmHarumi={routes:[{legs:[{steps:[{name:'晴海通り',ref:'東京都道304号'}]}]}]};
const osrmMitsume={routes:[{legs:[{steps:[{name:'三ツ目通り',ref:'東京都道319号'}]}]}]};
const osrmRinko={routes:[{legs:[{steps:[{name:'東京港臨海道路',ref:''},{name:'東京ゲートブリッジ',ref:''}]}]}]};
assert.equal(zones.routeMatchesExpected(osrmMeiji,meiji.routeMatchTokens),true,'Meiji-dori road signature must match');
assert.equal(zones.routeMatchesExpected(osrmHarumi,harumi.routeMatchTokens),true,'Harumi-dori road signature must match');
assert.equal(zones.routeMatchesExpected(osrmMitsume,mitsume.routeMatchTokens),true,'Mitsume-dori road signature must match');
assert.equal(zones.routeMatchesExpected(osrmRinko,rinko50.routeMatchTokens),true,'Tokyo Port Rinkai Road signature must match');
assert.equal(zones.routeMatchesExpected(osrmRinko,rinko60.routeMatchTokens),true,'Tokyo Gate Bridge segment signature must match');
assert.equal(zones.routeMatchesExpected({routes:[]},kan2.routeMatchTokens),false,'missing OSRM steps must fail closed');

for(const zone of current){
  assert.equal(zone.agency,'警視庁');
  assert.ok(zone.route&&zone.startLabel&&zone.endLabel&&zone.sourcePdf);
  assert.equal(zone.sourcePdf,'https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.files/tokyowangan.pdf');
  assert.ok(Number.isInteger(zone.startMinute)&&Number.isInteger(zone.endMinute));
}

assert.equal(Object.hasOwn(snapshot,'records'),false);
assert.equal(JSON.stringify(snapshot).includes('parserVersion'),false);
assert.equal(JSON.stringify(snapshot).includes('termsStatus'),false);

const html=fs.readFileSync(path.join(root,'drive-beta/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'drive-beta/app.js'),'utf8');
assert.match(html,/noindex,nofollow/);
assert.match(html,/まちドラ β/);
assert.match(html,/まちDRIVE/);
assert.doesNotMatch(html,/まちまも DRIVE β/);
assert.match(html,/現行公式PDF 9路線/);
assert.match(html,/id="scheduleToggle"/);
assert.match(html,/id="schedulePanel"/);
assert.match(html,/警視庁 公開交通取締り/);
assert.match(html,/実際に現場で取締り・検問を実施中であることを示す表示ではありません/);
assert.match(app,/accident_hotspots_in_view/);
assert.match(app,/watchPosition/);
assert.match(app,/router\.project-osrm\.org\/route\/v1\/driving/);
assert.match(app,/steps=true/);
assert.match(app,/routeMatchesExpected/);
assert.match(app,/route_signature_mismatch/);
assert.match(app,/endpointVerified/);
assert.match(app,/resolvedGeometries/);
assert.match(app,/\/drive-beta\/data\/tokyo-wangan-preview-v1\.json/);
assert.match(app,/\/drive-beta\/data\/tokyo-public-enforcement-2026-09-preview-v1\.json/);
assert.match(app,/loadPublicSchedule/);
assert.match(app,/現在の取締実施を示すリアルタイム情報ではありません/);
assert.doesNotMatch(app,/\/data\/drive\/tokyo-wangan-source-v1\.json/);
assert.match(app,/normalizeSnapshot/);
assert.doesNotMatch(html,/AED|交番/);
assert.doesNotMatch(app,/検問中/);

assert.match(html,/href="\/drive-beta\/drive\.css"/);
assert.match(html,/src="\/drive-beta\/enforcement-zones\.js"/);
assert.match(html,/src="\/drive-beta\/app\.js"/);
assert.doesNotMatch(html,/tokyo-wangan-snapshot\.js/);
assert.match(html,/id="accidentToggle" aria-pressed="false"/);
assert.match(app,/bindTooltip/);
assert.match(app,/accidentVisible=false/);

assert.equal(scheduleSnapshot.freshnessStatus,'CURRENT');
assert.equal(scheduleSnapshot.events.length,9);
assert.equal(Object.hasOwn(scheduleSnapshot,'gate'),false);
assert.equal(JSON.stringify(scheduleSnapshot).includes('termsStatus'),false);
const todaySchedule=scheduleSnapshot.events.find(e=>e.id==='school-route-2026-09-30');
assert.ok(todaySchedule);
assert.equal(todaySchedule.validDate,'2026-09-30');
assert.equal(todaySchedule.enforcementType,'通学路における全国一斉街頭指導');

console.log('drive beta static + public schedule contract: PASS');
