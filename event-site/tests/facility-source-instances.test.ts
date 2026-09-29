import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('facility source pilots remain discovery-only and fail closed',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/facility_source_instances_v1.json',import.meta.url),'utf8'));
  assert.ok(Array.isArray(data.instances));
  assert.ok(data.instances.length>=2);
  assert.ok(data.instances.every((row:any)=>row.review_state==='PREFLIGHT'));
  assert.ok(data.instances.every((row:any)=>row.automated_fetch_allowed===false));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-tokyo-bay-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='qs-amagasaki-events'));
  assert.ok(data.instances.every((row:any)=>Number(row.observed_current_items_min||0)>0));
});
