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

test('current READY audit keeps unresolved sources fail closed',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/ready_source_audit_v1.json',import.meta.url),'utf8'));
  assert.ok(data.sources.length>=3);
  assert.equal(data.sources.filter((row:any)=>row.decision==='READY').length,0);
  assert.ok(data.sources.every((row:any)=>Array.isArray(row.blockers)&&row.blockers.length>0));
});
