import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('facility source pilots keep content reuse closed and only explicit facts-only fetch may turn on',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/facility_source_instances_v1.json',import.meta.url),'utf8'));
  assert.ok(Array.isArray(data.instances));
  assert.ok(data.instances.length>=5);
  assert.ok(data.instances.every((row:any)=>['PREFLIGHT','TERMS_REVIEWED'].includes(row.review_state)));
  const automated=data.instances.filter((row:any)=>row.automated_fetch_allowed===true);
  assert.ok(automated.every((row:any)=>
    row.review_state==='TERMS_REVIEWED'
    && row.terms_status==='reviewed_facts_only'
    && row.fetch_scope==='facts_only'
    && row.body_text_reuse_allowed===false
    && row.image_reuse_allowed===false
    && row.html_cache_allowed===false
    && row.stop_on_403_429_or_explicit_bot_block===true
  ));
  assert.ok(data.instances
    .filter((row:any)=>row.automated_fetch_allowed!==true)
    .every((row:any)=>row.automated_fetch_allowed===false));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-tokyo-bay-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='qs-amagasaki-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-fukuoka-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='lalaport-numazu-events'));
  assert.ok(data.instances.some((row:any)=>row.source_key==='ario-hashimoto-events'));
  const kyotoStation=data.instances.find((row:any)=>row.source_key==='kyoto-station-building-events');
  assert.equal(kyotoStation?.automated_fetch_allowed,true);
  assert.equal(kyotoStation?.fetch_scope,'facts_only');
  assert.equal(kyotoStation?.body_text_reuse_allowed,false);
  assert.equal(kyotoStation?.image_reuse_allowed,false);
  assert.ok(data.instances.every((row:any)=>Number(row.observed_current_items_min||0)>0));
});


test('facility source instances use unique keys and HTTPS official pages',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/facility_source_instances_v1.json',import.meta.url),'utf8'));
  const keys=data.instances.map((row:any)=>row.source_key);
  assert.equal(new Set(keys).size,keys.length);
  assert.ok(data.instances.every((row:any)=>/^https:\/\//.test(row.homepage_url)));
  assert.ok(data.instances.every((row:any)=>/^https:\/\//.test(row.event_url)));
});


test('facility-backed oshi fixtures stay linked to a known facility host and prefecture',()=>{
  const facilities=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/facility_source_instances_v1.json',import.meta.url),'utf8'));
  const fixtures=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/fixtures/oshi_real_events_v1.json',import.meta.url),'utf8'));
  const targeted=fixtures.events.filter((event:any)=>
    /^lalaport-|^ario-|^sakuramachi-/.test(event.id)
  );
  assert.ok(targeted.length>=5);

  const host=(value:string)=>new URL(value).hostname.toLowerCase();
  for(const event of targeted){
    const matching=facilities.instances.filter((facility:any)=>
      facility.prefecture===event.prefecture
      && host(event.source_url)===host(facility.event_url)
    );
    assert.ok(matching.length>0,event.id+' should map to a known facility host/prefecture');
  }
});
