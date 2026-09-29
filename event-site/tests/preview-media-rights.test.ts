import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/preview_media_candidates_v1.json',import.meta.url),'utf8'));

test('preview media candidates require explicit rights and attribution',()=>{
  assert.equal(registry.status,'preview_only_rights_reviewed');
  assert.equal(registry.candidates.length,3);
  for(const item of registry.candidates){
    assert.equal(item.rights.display_allowed,true);
    assert.equal(item.rights.attribution_required,true);
    assert.ok(item.rights.attribution_text);
    assert.ok(item.rights.license_name);
    assert.ok(item.rights.license_url.startsWith('https://'));
    assert.ok(item.source_url.startsWith('https://commons.wikimedia.org/wiki/File:'));
  }
});

test('venue/place fallbacks are explicitly bound to Preview event records and never inferred by name alone',()=>{
  assert.equal(registry.hard_rules.infer_venue_match,false);
  assert.equal(registry.hard_rules.production_write,false);
  assert.equal(registry.hard_rules.r2_copy,false);
  assert.equal(registry.hard_rules.sns_publish,false);
  assert.ok(registry.candidates.every((item:any)=>item.event_seed_slug&&item.venue_name));
});
