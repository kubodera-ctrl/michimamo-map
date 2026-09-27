import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('home ASP placement follows explicit user intent and stays runtime-driven',()=>{
  const source=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
  assert.match(source,/AspPlacement/);
  assert.match(source,/rainyDayOnly\s*\?\s*'rain'/);
  assert.match(source,/childFocusOnly\s*\?\s*'child'/);
  assert.match(source,/familyFriendlyOnly\s*\?\s*'family'/);
  assert.match(source,/hasExplicitSearch[\s\S]*\?\s*'search'/);
  assert.match(source,/placementId=\{contextualAspPlacement\}/);
  assert.doesNotMatch(source,/tracking_url|program_id/);
});

test('category listing uses shared feature placement without hardcoded offer data',()=>{
  const source=fs.readFileSync(new URL('../app/category/[category]/page.tsx',import.meta.url),'utf8');
  assert.match(source,/AspPlacement placementId="feature"/);
  assert.match(source,/sourceScreen=\{'category-'\+category\}/);
  assert.doesNotMatch(source,/tracking_url|program_id/);
});
