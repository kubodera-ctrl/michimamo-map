import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseAomoriSpeedGuidelineAudit} from '../scripts/drive_aomori_speed_parser.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'evidence/machidora5/aomori-source-audit-2026-09-30.json'),'utf8'));
const parsed=parseAomoriSpeedGuidelineAudit(audit,{mode:'preview'});
assert.equal(parsed.parserVersion,'aomori_speed_guideline_visual_v1');
assert.equal(parsed.gate.publishable,true);
assert.equal(parsed.events.length,4);
assert.deepEqual(parsed.events.map(e=>[e.routeName,e.segmentStartText,e.segmentEndText,e.speedLimitKmh]),[
 ['東北自動車道','青森IC','大鰐弘前IC',100],
 ['東北自動車道','大鰐弘前IC','秋田県境',80],
 ['三陸沿岸道路','八戸JCT','岩手県境',70],
 ['八戸自動車道','八戸IC','岩手県境',80]
]);
assert.equal(parsed.events.every(e=>e.timePrecision==='UNSPECIFIED'&&e.timeText===null),true);
assert.equal(parsed.events.every(e=>e.geoPrecision==='ROAD_AREA'&&e.displayMode==='ROAD_AREA_GUIDELINE'),true);
assert.equal(parsed.events.every(e=>e.routeEndpoints===null&&e.endpointVerified===false&&e.geometryVerified===false),true);
assert.equal(parseAomoriSpeedGuidelineAudit(audit,{mode:'production'}).gate.publishable,false);
assert.deepEqual(parseAomoriSpeedGuidelineAudit(audit,{mode:'production'}).gate.reasons,['terms_not_allowed']);
const noVisual=structuredClone(audit); noVisual.visualQa.approved=false;
assert.equal(parseAomoriSpeedGuidelineAudit(noVisual,{mode:'preview'}).events.length,0);
assert.equal(parseAomoriSpeedGuidelineAudit(noVisual,{mode:'preview'}).gate.reasons.includes('visual_qa_unapproved'),true);
console.log('PASS: Aomori visual-audited half-year PDF parser contract');
