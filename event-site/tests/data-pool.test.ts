import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readJson=(path:string)=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));

test('Kanto source registry is conservative and structurally valid',()=>{
  const registry=readJson('../../data/machiibe/source_registry_kanto_v1.json');
  assert.ok(Array.isArray(registry.sources));
  assert.ok(registry.sources.length>=20);
  const keys=new Set<string>();
  for(const source of registry.sources){
    assert.equal(typeof source.source_key,'string');
    assert.ok(!keys.has(source.source_key),`duplicate source_key: ${source.source_key}`);
    keys.add(source.source_key);
    assert.match(source.homepage_url,/^https:\/\//);
    assert.match(source.event_url,/^https:\/\//);
    assert.equal(source.automatic_fetch_allowed,false);
    assert.equal(source.image_policy,'not_used');
    assert.ok(['manual_facts_only','discovery_only'].includes(source.acquisition));
  }
});

test('Kanto candidate event pool has no duplicate slugs and only known sources',()=>{
  const registry=readJson('../../data/machiibe/source_registry_kanto_v1.json');
  const pool=readJson('../../data/machiibe/candidate_events_kanto_v1.json');
  const sourceKeys=new Set<string>(registry.sources.map((source:any)=>source.source_key));
  const slugs=new Set<string>();
  assert.ok(pool.candidates.length>=50);
  assert.equal(pool.count,pool.candidates.length);

  for(const event of pool.candidates){
    assert.match(event.slug,/^[a-z0-9][a-z0-9-]{2,159}$/);
    assert.ok(!slugs.has(event.slug),`duplicate event slug: ${event.slug}`);
    slugs.add(event.slug);
    assert.match(event.start_date,/^\d{4}-\d{2}-\d{2}$/);
    assert.match(event.end_date,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(event.end_date>=event.start_date,`invalid date range: ${event.slug}`);
    assert.ok(sourceKeys.has(event.source_key),`unknown source: ${event.source_key}`);
    assert.match(event.source_url,/^https:\/\//);
    assert.equal(event.publishable,false);
    assert.equal(event.image_policy,'not_used');
    assert.ok(['detail_verified','official_list_verified','discovery_only','needs_occurrence_review'].includes(event.review_state));
  }
});

test('candidate pool has useful regional and rainy-day coverage',()=>{
  const pool=readJson('../../data/machiibe/candidate_events_kanto_v1.json');
  const byPref=new Map<string,number>();
  let indoorFamily=0;
  for(const event of pool.candidates){
    byPref.set(event.prefecture,(byPref.get(event.prefecture)||0)+1);
    if(event.indoor_hint===true && event.family_hint===true) indoorFamily+=1;
  }
  for(const pref of ['東京都','神奈川県','千葉県','埼玉県']){
    assert.ok((byPref.get(pref)||0)>=5,`insufficient coverage: ${pref}`);
  }
  assert.ok(indoorFamily>=10,'rainy-day indoor family candidates should be well represented');
});


test('only detail-verified candidates are promoted into production seed',()=>{
  const pool=readJson('../../data/machiibe/candidate_events_kanto_v1.json');
  const promoted=pool.candidates.filter((event:any)=>event.production_seed===true);
  assert.equal(promoted.length,26);
  assert.equal(pool.production_seed_promoted,26);
  for(const event of promoted){
    assert.equal(event.review_state,'detail_verified',`non-detail candidate promoted: ${event.slug}`);
    assert.match(event.seed_note,/official-detail(?:\\/operator)? recheck/i);
  }
});


test('national mall source target registry is conservative and structurally valid',()=>{
  const registry=readJson('../../data/machiibe/venue_source_targets_v1.json');
  assert.ok(Array.isArray(registry.targets));
  assert.ok(registry.targets.length>=12);
  assert.equal(registry.policy.automated_fetch_default,false);
  assert.equal(registry.policy.facility_detail_recheck_required,true);
  assert.equal(registry.policy.target_count,registry.targets.length);

  const keys=new Set<string>();
  let nationalDiscovery=0;
  for(const source of registry.targets){
    assert.equal(typeof source.source_key,'string');
    assert.ok(!keys.has(source.source_key),`duplicate venue source_key: ${source.source_key}`);
    keys.add(source.source_key);
    assert.match(source.homepage_url,/^https:\/\//);
    assert.match(source.event_url,/^https:\/\//);
    assert.equal(source.venue_type,'mall');
    assert.equal(source.automated_fetch_allowed,false);
    assert.equal(source.acquisition_mode,'discovery_only');
    assert.equal(source.terms_review_status,'contact_required');
    assert.ok(['national_discovery','facility_directory'].includes(source.role));
    if(source.role==='national_discovery') nationalDiscovery+=1;
  }

  for(const required of [
    'mall-discovery-aeonmall-corporate-events',
    'mall-discovery-mitsui-shopping-park',
    'mall-discovery-ario',
    'mall-discovery-opa',
    'mall-discovery-marui-modi',
    'mall-discovery-premium-outlets'
  ]){
    assert.ok(keys.has(required),`missing important mall source: ${required}`);
  }
  assert.ok(nationalDiscovery>=2);
});


test('batch 3 promoted candidates use official detail URLs',()=>{
  const pool=readJson('../../data/machiibe/candidate_events_kanto_v1.json');
  const expected=new Map<string,string>([
    ['fujiko-15th-gadget-2026','fujiko-museum.com'],
    ['kanagawa-life-satoyama-animals-2026','nh.kanagawa-museum.jp'],
    ['yokohama-english-garden-halloween-2026','y-eg.jp'],
    ['sankeien-moon-viewing-2026','sankeien.or.jp'],
    ['isumi-lobster-festival-2026','isumi-kankou.com'],
    ['onjuku-lobster-festival-2026','onjuku-kankou.com']
  ]);
  for(const [slug,host] of expected){
    const event=pool.candidates.find((item:any)=>item.slug===slug);
    assert.ok(event,`missing batch3 candidate: ${slug}`);
    assert.equal(event.review_state,'detail_verified');
    assert.equal(event.production_seed,true);
    assert.equal(new URL(event.source_url).hostname.replace(/^www\./,''),host);
    assert.match(event.seed_note,/official-detail(?:\\/operator)? recheck/i);
  }
});
