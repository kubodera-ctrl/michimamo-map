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

test('candidate coverage does not imply automation approval unless a source reaches FETCH_ALLOWED',()=>{
  assert.ok(registry.sources.every((row:any)=>row.active===true));
  assert.ok(registry.sources
    .filter((row:any)=>['CANDIDATE','TERMS_REVIEWED'].includes(row.source_stage))
    .every((row:any)=>row.automated_fetch_allowed===false));
  const approved=registry.sources.filter((row:any)=>row.automated_fetch_allowed===true);
  assert.equal(approved.length,1);
  assert.equal(approved[0].prefecture,'三重県');
  assert.equal(approved[0].source_stage,'FETCH_ALLOWED');
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

test('source candidates expose promotion stage and never skip from candidate review to automation',()=>{
  const allowed=new Set(['CANDIDATE','TERMS_REVIEWED','FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW']);
  for(const row of registry.sources){
    assert.ok(allowed.has(row.source_stage),row.prefecture+' invalid source_stage');
    if(row.source_stage==='CANDIDATE') assert.equal(row.automated_fetch_allowed,false);
    if(row.source_stage==='TERMS_REVIEWED') assert.equal(row.automated_fetch_allowed,false);
  }
  assert.equal(registry.summary.automation_approved,1);
  assert.equal(registry.summary.stage_counts.FETCH_ALLOWED,1);
});
