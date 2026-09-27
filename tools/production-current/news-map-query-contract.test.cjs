'use strict';
const assert = require('node:assert/strict');
const c = require('./news-map-query-contract.cjs');

let r=c.validateNewsMapQuery({
  service:'machimamo',from:'2026-08-01',to:'2026-09-27',
  bounds:{south:35.4,west:139.4,north:35.9,east:140.1}
});
assert.equal(r.valid,true);
assert.equal(r.normalized.limit,250);
assert.equal(r.normalized.scope,'viewport');
assert.equal(r.normalized.sort,'newsDate_desc_candidateId_desc');

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-06-01',to:'2026-09-27',prefecture:'東京都'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('60 days')));

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('viewport')));

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27',prefecture:'東京'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('47 prefectures')));

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27',prefecture:'東京都',municipalities:['港区','港区','江東区']});
assert.equal(r.valid,true);
assert.deepEqual(r.normalized.municipalities,['港区','江東区']);

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27',bounds:{south:35,west:139,north:36,east:140},municipalities:['港区']});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('municipalities require')));

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27',prefecture:'東京都',limit:501});
assert.equal(r.valid,false);

const sourceCandidate={
  service:'machimamo',candidateId:'n1',informationKind:'POLICE_OFFICIAL',headline:'逆走車確認',
  prefecture:'東京都',municipality:'江東区',newsDate:'2026-09-24',category:'TRAFFIC_WRONG_WAY',
  verifiedFacts:['should not leak'],source:{sourceHash:'a'.repeat(64)},mapDisplayEligible:true,
  mapRepresentative:{lat:35.67,lon:139.82,precision:'municipality'}
};
const projection=c.publicMapProjection(sourceCandidate);
assert.equal(projection.candidateId,'n1');
assert.equal(projection.representativeLocation.precision,'municipality');
assert.equal('verifiedFacts' in projection,false);
assert.equal('source' in projection,false);
assert.equal(c.publicMapProjection({...sourceCandidate,mapDisplayEligible:false}),null);
assert.equal(c.publicMapProjection({...sourceCandidate,informationKind:'LEGACY_UNVERIFIED'}),null);

r=c.validateMapPage({items:[sourceCandidate],nextCursor:'opaque-1',truncated:true},{service:'machimamo',from:'2026-09-01',to:'2026-09-27',prefecture:'東京都',limit:1});
assert.equal(r.valid,true);

r=c.validateMapPage({items:[sourceCandidate,sourceCandidate],nextCursor:null,truncated:false},{service:'machimamo',from:'2026-09-01',to:'2026-09-27',prefecture:'東京都',limit:2});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('duplicate candidateId')));

console.log('PASS news map query contract: bounded scope, 47-prefecture validation, municipality bounds, explicit MAP admission, minimal projection, page contract');
