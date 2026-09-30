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


test('READY registry and audit stay aligned with every fetch gate explicit',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/national_source_discovery_v1.json',import.meta.url),'utf8'));
  const audit=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/ready_source_audit_v1.json',import.meta.url),'utf8'));
  const registryReady=registry.sources.filter((row:any)=>row.review_state==='READY');
  const auditReady=audit.sources.filter((row:any)=>row.decision==='READY');
  const registryKeys=registryReady.map((row:any)=>row.source_key).sort();
  const auditKeys=auditReady.map((row:any)=>row.source_key).sort();

  assert.deepEqual(registryKeys,auditKeys);
  assert.equal(registry.counts.ready,registryReady.length);
  assert.ok(registryReady.length>=5);

  for(const row of registryReady){
    assert.equal(row.automated_fetch_allowed,true,row.source_key);
    assert.match(row.feed_url,/^https:\/\//,row.source_key);
    assert.equal(row.terms_status,'reviewed_allowed',row.source_key);
    assert.ok(['allowed','not_applicable'].includes(row.robots_status),row.source_key);
    assert.equal(row.commercial_use_status,'allowed',row.source_key);
    assert.equal(row.reuse_status,'allowed',row.source_key);
    assert.ok(row.attribution_requirement,row.source_key);
  }
});
