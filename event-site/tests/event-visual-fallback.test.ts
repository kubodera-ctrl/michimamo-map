import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eventFallbackVisual} from '../components/EventVisualFallback';

test('rights-safe fallback prefers event category and clearly remains a category visual',()=>{
  assert.equal(eventFallbackVisual({category_keys:['festival'],venue_type_keys:['park_plaza']}).label,'お祭り');
  assert.equal(eventFallbackVisual({category_keys:[],venue_type_keys:['mall']}).label,'モール・商業施設');
  const source=fs.readFileSync(new URL('../components/EventVisualFallback.tsx',import.meta.url),'utf8');
  assert.match(source,/カテゴリイメージ/);
  assert.doesNotMatch(source,/公式画像|会場写真/);
});

test('web cards and details only use category fallback when image_url is absent',()=>{
  const card=fs.readFileSync(new URL('../components/EventCard.tsx',import.meta.url),'utf8');
  const detail=fs.readFileSync(new URL('../app/events/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(card,/event\.image_url \?/);
  assert.match(card,/EventVisualFallback/);
  assert.match(detail,/event\.image_url \?/);
  assert.match(detail,/EventVisualFallback/);
});
