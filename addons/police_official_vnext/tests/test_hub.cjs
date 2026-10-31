'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const lib=require('../official-police-hub.js');
let count=0;const ok=(cond,label)=>{assert.ok(cond,label);count++};
const sources=JSON.parse(fs.readFileSync(path.join(__dirname,'../official_source_registry.json'),'utf8'));
ok(lib.visibleDirectory(sources).length===47,'reuses exact 47-prefecture catalog');
ok(lib.isSafeSourceUrl('https://www.keishicho.metro.tokyo.lg.jp/jiken_jiko/hassei/map_annai.html'),'official map');
ok(!lib.isSafeSourceUrl('javascript:alert(1)'),'rejects javascript');
ok(!lib.isSafeSourceUrl('http://example.com'),'requires HTTPS');
ok(!lib.isSafeSourceUrl('https://evil.example.com'),'rejects unknown host');
assert.throws(()=>lib.visibleDirectory({...sources,sources:sources.sources.slice(1)}),/47/);count++;
assert.throws(()=>lib.visibleDirectory({...sources,data_ingestion_enabled:true}),/registry/);count++;
const record={id:'stable',municipality:'港区',town:'台場一丁目',crime_type:'自転車盗',recognized_count_cumulative:3,
 review_status:'approved',rights_status:'verified',latitude:null,longitude:null};
const release={year:2026,through_month:9,revision:1,review_status:'approved',rights_status:'verified',records:[record]};
const snap={schema_version:1,dataset:'town_stats',publication_enabled:true,releases:[release]};
ok(lib.visibleReleaseRows(snap,'town_stats').length===1,'approved one period');
ok(lib.visibleReleaseRows({...snap,publication_enabled:false},'town_stats').length===0,'no automatic publishing');
ok(lib.visibleReleaseRows({...snap,releases:[{...release,rights_status:'unverified'}]},'town_stats').length===0,'unlicensed hidden');
ok(lib.visibleReleaseRows({...snap,releases:[{...release,review_status:'pending_correction'}]},'town_stats').length===0,'corrections held');
ok(lib.visibleReleaseRows({...snap,releases:[{...release,records:[{...record,review_status:'pending'}]}]},'town_stats').length===0,'unreviewed held');
ok(lib.visibleReleaseRows({...snap,releases:[{...release,requires_review:true}]},'town_stats').length===0,'reverse cumulative held');
assert.throws(()=>lib.visibleReleaseRows({...snap,releases:[{...release,records:[{...record,latitude:35.6}]}]},'town_stats'),/coordinates/);count++;
ok(lib.visibleReleaseRows({...snap,releases:[{...release,revision:1},{...release,revision:2}]},'town_stats').length===1,'latest revision only');
ok(lib.visibleReleaseRows({...snap,releases:[{...release,revision:1},{...release,revision:2,review_status:'pending'}]},'town_stats').length===0,'new pending correction suppresses prior');
const oldMonth={...release,through_month:8,records:[{...record,recognized_count_cumulative:2}]};
ok(lib.visibleReleaseRows({...snap,releases:[oldMonth,release]},'town_stats').length===1,'only latest cumulative month, no double counts');
ok(lib.visibleReleaseRows({...snap,releases:[oldMonth,{...release,review_status:'pending'}]},'town_stats').length===0,'pending newer month suppresses older public cumulative');
assert.throws(()=>lib.visibleReleaseRows({...snap,releases:[{...release,records:[{...record,recognized_count_cumulative:-2}]}]},'town_stats'),/count/);count++;

assert.throws(()=>lib.visibleReleaseRows({...snap,releases:[release,release]},'town_stats'),/duplicate release revision/);count++;
// No in-place native map changes or posting/point APIs in module.
const code=fs.readFileSync(path.join(__dirname,'../official-police-hub.js'),'utf8');
for(const forbidden of ['admin_adjust_points','submit_spot_once','point_transactions','https://api.geo'])ok(!code.includes(forbidden),`no ${forbidden} calls`);
console.log(`official-police-hub: ${count} targeted assertions PASS`);
