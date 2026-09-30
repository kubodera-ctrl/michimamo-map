import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('facility source pilots remain discovery-only and fail closed',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/facility_source_instances_v1.json',import.meta.url),'utf8'));
  assert.ok(Array.isArray(data.instances));
  assert.ok(data.instances.length>=5);
  assert.ok(data.instances.every((row:any)=>row.review_state==='PREFLIGHT'));
  assert.ok(data.instances.every((row:any)=>row.automated_fetch_allowed===false));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-tokyo-bay-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='qs-amagasaki-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-fukuoka-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-numazu-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='ario-hashimoto-events'));
  assert.ok(data.instances.every((row:any)=>Number(row.observed_current_items_min||0)>0));
});


test('facility source instances use unique keys and HTTPS official pages',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/facility_source_instances_v1.json',import.meta.url),'utf8'));
  const keys=data.instances.map((row:any)=>row.source_key);
  assert.equal(new Set(keys).size,keys.length);
  assert.ok(data.instances.every((row:any)=>/^https:\/\//.test(row.homepage_url)));
  assert.ok(data.instances.every((row:any)=>/^https:\/\//.test(row.event_url)));
});
