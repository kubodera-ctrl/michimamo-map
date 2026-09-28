import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/national_prefecture_source_coverage_v1.json',import.meta.url),'utf8'));

test('national source candidate registry covers all 47 prefectures exactly once',()=>{
  assert.equal(registry.sources.length,47);
  assert.equal(new Set(registry.sources.map((row:any)=>row.prefecture)).size,47);
  assert.equal(registry.summary.prefecture_coverage,47);
  assert.equal(registry.summary.prefecture_total,47);
});

test('candidate coverage never implies automation approval',()=>{
  assert.ok(registry.sources.every((row:any)=>row.active===true));
  assert.ok(registry.sources.every((row:any)=>row.automated_fetch_allowed===false));
  assert.ok(registry.sources.every((row:any)=>row.terms_status!=='pending'||row.commercial_use_status==='unknown'));
});

test('each source records rights and provenance review fields without secrets',()=>{
  for(const row of registry.sources){
    for(const key of ['source_name','source_url','fetch_method','terms_status','robots_status','commercial_use_status','redistribution_status','cache_status','image_use_status','sns_use_status','last_checked_at','active']){
      assert.ok(Object.hasOwn(row,key),row.prefecture+' missing '+key);
    }
    assert.equal('token' in row,false);
    assert.equal('password' in row,false);
    assert.equal('secret' in row,false);
  }
});
