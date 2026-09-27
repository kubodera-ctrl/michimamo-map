'use strict';
const assert = require('node:assert/strict');
const c = require('./news-map-query-contract.cjs');

let r=c.validateNewsMapQuery({
  service:'machimamo',from:'2026-08-01',to:'2026-09-27',
  bounds:{south:35.4,west:139.4,north:35.9,east:140.1}
});
assert.equal(r.valid,true);
assert.equal(r.normalized.limit,250);

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-06-01',to:'2026-09-27',prefecture:'東京都'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('60 days')));

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27'});
assert.equal(r.valid,false);
assert.ok(r.errors.some(x=>x.includes('viewport')));

r=c.validateNewsMapQuery({service:'machimamo',from:'2026-09-01',to:'2026-09-27',prefecture:'東京都',limit:501});
assert.equal(r.valid,false);

const projection=c.publicMapProjection({
  candidateId:'n1',informationKind:'POLICE_OFFICIAL',headline:'逆走車確認',
  prefecture:'東京都',municipality:'江東区',newsDate:'2026-09-24',category:'TRAFFIC_WRONG_WAY',
  verifiedFacts:['should not leak'],source:{sourceHash:'a'.repeat(64)},
  mapRepresentative:{lat:35.67,lon:139.82,precision:'municipality'}
});
assert.equal(projection.candidateId,'n1');
assert.equal(projection.representativeLocation.precision,'municipality');
assert.equal('verifiedFacts' in projection,false);
assert.equal('source' in projection,false);

console.log('PASS news map query contract: viewport/region required, 60-day cap, bounded paging, minimal projection');
