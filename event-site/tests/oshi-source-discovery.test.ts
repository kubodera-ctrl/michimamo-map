import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('oshi source lane uses official candidates and stays fail closed',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/oshi_source_discovery_v1.json',import.meta.url),'utf8'));
  assert.ok(data.sources.length>=6);
  assert.ok(data.sources.every((row:any)=>row.review_state==='PREFLIGHT'));
  assert.ok(data.sources.every((row:any)=>row.automated_fetch_allowed===false));
  assert.ok(data.sources.some((row:any)=>row.source_key==='animate-only-shop'));
  assert.ok(data.sources.some((row:any)=>row.source_key==='tower-records-store-events'));
  assert.ok(data.sources.some((row:any)=>row.source_key==='bandainamco-amusement-events'));
  assert.ok(data.sources.some((row:any)=>row.source_key==='sakuramachi-kumamoto-oshi-events'));
  assert.ok(data.sources.some((row:any)=>row.primary_event_types.includes('collab_cafe')));
  assert.ok(data.sources.some((row:any)=>row.primary_event_types.includes('mini_live')));
});

test('oshi source discovery separates destination events from ordinary sale intent',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/oshi_source_discovery_v1.json',import.meta.url),'utf8'));
  assert.equal(data.rules.ordinary_sale_excluded,true);
  assert.equal(data.rules.limited_destination_retail_may_be_event,true);
  assert.equal(data.rules.official_page_confirmation_required,true);
});


test('oshi source discovery delegates official X to a fail-closed registry',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/oshi_source_discovery_v1.json',import.meta.url),'utf8'));
  assert.equal(data.rules.official_x_discovery_supported,true);
  assert.equal(data.rules.official_x_registry,'data/machiibe/official_x_source_registry_v1.json');
  assert.equal(data.rules.official_x_web_scraping_allowed,false);
  assert.equal(data.rules.official_x_api_enabled,false);
  assert.equal(data.rules.official_x_blue_check_alone_is_official,false);
  assert.equal(data.rules.official_x_full_post_body_reuse,false);
  assert.equal(data.rules.official_x_media_reuse,false);
  assert.equal(data.rules.official_x_default_surface,'link_out');
});
