import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPreviewRegistry,enableAutomatedFetch,registryRowFromBundle} from '../scripts/drive_source_registry.mjs';
import {claimDueSources,nextCheckAt} from '../scripts/drive_poll_scheduler.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');

function load(rel){return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));}

const tokyoSpeed=load('data/drive/tokyo-wangan-source-v1.json');
const tokyoMonthly=load('data/drive/tokyo-public-enforcement-2026-09.json');
const chiba=load('data/drive/chiba-urayasu-speed-guideline-v1.json');
const kanagawaTakatsu=load('data/drive/kanagawa-takatsu-speed-guideline-v1.json');
const kanagawaArea=load('data/drive/kanagawa-kanagawa-speed-guideline-v1.json');
const saitamaSpeed=load('data/drive/saitama-speed-priority-2026-03.json');
const saitamaFocus=load('data/drive/saitama-urawa-focus-areas-v1.json');

const registry=buildPreviewRegistry([
  {bundle:tokyoSpeed,overrides:{contentFormat:'PDF'}},
  {bundle:tokyoMonthly,overrides:{contentFormat:'HTML'}},
  {bundle:chiba,overrides:{contentFormat:'PDF'}},
  {bundle:kanagawaTakatsu,overrides:{contentFormat:'HTML'}},
  {bundle:kanagawaArea,overrides:{contentFormat:'HTML'}},
  {bundle:saitamaSpeed,overrides:{contentFormat:'PDF'}},
  {bundle:saitamaFocus,overrides:{contentFormat:'PDF'}}
]);

assert.equal(registry.length,7);
assert.deepEqual(registry.map(x=>x.sourceKey),[
  'tokyo:tokyo-wangan:speed-guideline',
  'tokyo:public-enforcement:2026-09',
  'chiba:urayasu:speed-guideline',
  'kanagawa:takatsu:speed-guideline',
  'kanagawa:kanagawa:speed-guideline',
  'saitama:prefecture:speed-priority-2026-03',
  'saitama:focus-areas:urawa'
]);

const byKey=Object.fromEntries(registry.map(row=>[row.sourceKey,row]));
assert.equal(byKey['tokyo:tokyo-wangan:speed-guideline'].pollProfileId,'ANNUAL_CHANGE_DETECT');
assert.equal(byKey['tokyo:public-enforcement:2026-09'].pollProfileId,'MONTHLY_BOUNDARY');
assert.equal(byKey['chiba:urayasu:speed-guideline'].pollProfileId,'ANNUAL_CHANGE_DETECT');
assert.equal(byKey['kanagawa:takatsu:speed-guideline'].pollProfileId,'HTML_CHANGE_DETECT');
assert.equal(byKey['kanagawa:kanagawa:speed-guideline'].pollProfileId,'HTML_CHANGE_DETECT');
assert.equal(byKey['saitama:prefecture:speed-priority-2026-03'].pollProfileId,'ANNUAL_CHANGE_DETECT');
assert.equal(byKey['saitama:focus-areas:urawa'].pollProfileId,'ANNUAL_CHANGE_DETECT');

assert.deepEqual(
  [...new Set(registry.map(x=>x.prefectureCode))].sort(),
  ['11','12','13','14'],
  'preview registry must cover Saitama/Chiba/Tokyo/Kanagawa'
);

assert.equal(registry.every(x=>x.termsStatus==='PENDING'),true);
assert.equal(registry.every(x=>x.automatedFetchAllowed===false),true);
assert.equal(registry.every(x=>x.automationBlocker==='TERMS_PENDING'),true);

const dueAttempt=registry.map(row=>({...row,nextCheckAt:'2026-09-30T00:00:00Z'}));
assert.deepEqual(
  claimDueSources(dueAttempt,'2026-09-30T01:00:00Z',{allowPending:true}),
  [],
  'terms pending is not enough: automatedFetchAllowed must also be explicitly enabled'
);

const allowed=registryRowFromBundle(tokyoSpeed,{
  contentFormat:'PDF',
  termsStatus:'ALLOWED',
  automatedFetchAllowed:false,
  nextCheckAt:'2026-09-30T00:00:00Z'
});
assert.equal(allowed.automatedFetchAllowed,false);
assert.equal(allowed.automationBlocker,'MANUAL_DISABLED');

const enabled=enableAutomatedFetch(allowed);
assert.equal(enabled.automatedFetchAllowed,true);
assert.equal(enabled.automationBlocker,'NONE');

const scheduled={...enabled,nextCheckAt:nextCheckAt(enabled,'2026-09-30T00:00:00Z')};
assert.ok(Date.parse(scheduled.nextCheckAt)>Date.parse('2026-09-30T00:00:00Z'));

assert.throws(
  ()=>buildPreviewRegistry([{bundle:tokyoSpeed},{bundle:tokyoSpeed}]),
  /duplicate_source_key/
);
assert.throws(
  ()=>enableAutomatedFetch(registry[0]),
  /terms_not_allowed/
);

console.log('PASS: Kanto 4-prefecture DRIVE Source Registry -> poll scheduler fail-closed contract');
