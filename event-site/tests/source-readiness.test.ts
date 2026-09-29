import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isReadySource,readySourceBlockers} from '../../shared/machiibe-ingestion/readiness';

test('READY requires every compliance, resource and freshness gate',()=>{
  const audit={
    sourceKey:'sample',termsAllowed:true,robotsOrApiPolicyClear:true,resourceResolved:true,
    commercialAllowed:true,reuseAllowed:true,attributionKnown:true,freshnessAcceptable:true,
    thirdPartyRightsSeparated:true
  };
  assert.equal(isReadySource(audit),true);
  assert.deepEqual(readySourceBlockers({...audit,freshnessAcceptable:false}),['freshness']);
});

test('current READY audit promotes only sources with every gate cleared',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/ready_source_audit_v1.json',import.meta.url),'utf8'));
  assert.ok(data.sources.length>=4);
  const ready=data.sources.filter((row:any)=>row.decision==='READY');
  const hold=data.sources.filter((row:any)=>row.decision!=='READY');
  assert.equal(ready.length,1);
  assert.equal(ready[0].source_key,'mie-pref-events-open-data');
  assert.deepEqual(ready[0].blockers,[]);
  assert.ok(hold.every((row:any)=>Array.isArray(row.blockers)&&row.blockers.length>0));
});
