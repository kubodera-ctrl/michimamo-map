import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('brand icon never exposes browser broken-image UI after asset failure',()=>{
  const brand=fs.readFileSync(new URL('../components/BrandNav.tsx',import.meta.url),'utf8');
  const icon=fs.readFileSync(new URL('../public/machiibe-icon.svg',import.meta.url),'utf8');
  assert.match(brand,/onError=\{\(\)=>setIconFailed\(true\)\}/);
  assert.match(brand,/brand-icon-fallback/);
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
