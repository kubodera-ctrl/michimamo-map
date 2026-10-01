import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('brand icon never exposes browser broken-image UI after asset failure',()=>{
  const brand=fs.readFileSync(new URL('../components/BrandNav.tsx',import.meta.url),'utf8');
  const icon=fs.readFileSync(new URL('../public/machiibe-icon.svg',import.meta.url),'utf8');
  assert.match(brand,/onError=\{\(\)=>setLogoFailed\(true\)\}/);
  assert.match(brand,/brand-wordmark-fallback/);
  assert.doesNotMatch(icon,/data:image|<image\b/i);
});

test('event media falls back once to owned category visual on load failure',()=>{
  const media=fs.readFileSync(new URL('../components/EventMedia.tsx',import.meta.url),'utf8');
  assert.match(media,/onError=\{\(\)=>setFailed\(true\)\}/);
  assert.match(media,/EventVisualFallback/);
  assert.doesNotMatch(media,/retry|setTimeout|setInterval/i);
});

test('event cards preserve search return state and keep the list hierarchy concise',()=>{
  const card=fs.readFileSync(new URL('../components/EventCard.tsx',import.meta.url),'utf8');
  const home=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  const detail=fs.readFileSync(new URL('../app/events/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(card,/rememberSearchScroll\(returnTo\)/);
  assert.match(home,/currentSearchPath/);
  assert.match(home,/returnTo=\{currentSearchPath\}/);
  assert.match(detail,/検索結果へ戻る/);
  assert.match(detail,/returnTo/);
  assert.match(card,/event-card-tags/);
  assert.doesNotMatch(card,/fandom_slugs\.slice\(0,2\)\.map/);
});

test('Preview QA can show licensed venue/place photos without confusing them with event artwork',()=>{
  const seed=fs.readFileSync(new URL('../lib/machiibe-search-qa-seed.generated.ts',import.meta.url),'utf8');
  const media=fs.readFileSync(new URL('../components/EventMedia.tsx',import.meta.url),'utf8');
  assert.match(seed,/Tokyo_Joypolis_entrance\.jpg/);
  assert.match(seed,/Tokyo_Skytree_%26_Soramachi\.jpg/);
  assert.match(seed,/Sogo_Yokohama\.jpg/);
  assert.match(seed,/CC BY 2\.5/);
  assert.match(seed,/CC BY-SA 4\.0/);
  assert.match(media,/会場イメージ/);
  assert.match(media,/場所イメージ/);
  assert.match(media,/event-media-credit/);
});
