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
  assert.ok(ready.length>=2);
  assert.ok(ready.some((row:any)=>row.source_key==='mie-pref-events-open-data'));
  assert.ok(ready.some((row:any)=>row.source_key==='bodik-okazaki-events'));
  assert.ok(ready.every((row:any)=>Array.isArray(row.blockers)&&row.blockers.length===0));
  assert.ok(hold.every((row:any)=>Array.isArray(row.blockers)&&row.blockers.length>0));
});
