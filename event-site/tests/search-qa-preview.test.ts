import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildQaEvents,searchQaEvents} from '../lib/machiibe-search-qa-data';

test('search QA data is fixture-only and separates verified factual snapshots from synthetic coverage',()=>{
  const rows=buildQaEvents('2026-09-28');
  assert.ok(rows.length>=16);
  assert.ok(rows.every((row)=>row.fixtureOnly===true));
  assert.ok(rows.some((row)=>row.qaKind==='verified_ci'));
  assert.ok(rows.some((row)=>row.qaKind==='synthetic'));
});

test('search QA covers municipality, price, indoor, family, venue and experience filters',()=>{
  const rows=buildQaEvents('2026-09-28');
  const result=searchQaEvents(rows,{
    startDate:'2026-09-28',endDate:'2026-10-28',prefecture:'東京都',municipality:'江東区',
    priceTypes:['partly_free'],indoorOnly:true,audienceIntents:['family_friendly'],venueTypes:['mall'],venueFilterActive:true
  });
  assert.ok(result.some((row)=>row.slug==='qa-synthetic-tomorrow-mall-rain'));
  const gem=searchQaEvents(rows,{startDate:'2026-09-28',endDate:'2026-10-28',categories:['experience_gem']});
  assert.equal(gem.length,1);
});

test('preview QA routes are noindex, query-driven and keep a search return path',()=>{
  const page=fs.readFileSync(new URL('../app/preview/search-qa/page.tsx',import.meta.url),'utf8');
  const detail=fs.readFileSync(new URL('../app/preview/search-qa/events/[slug]/page.tsx',import.meta.url),'utf8');
  assert.match(page,/robots:\{index:false,follow:false\}/);
  assert.match(page,/EventFilters/);
  assert.match(page,/municipality/);
  assert.match(page,/fixtureOnly=true/);
  assert.match(page,/returnTo|returnPath/);
  assert.match(detail,/同じ検索条件へ戻る/);
  assert.match(detail,/fixtureOnly=true/);
  assert.match(detail,/Production・SNS・ASP・SEO/);
});
