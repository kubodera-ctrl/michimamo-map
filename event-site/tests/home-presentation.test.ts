import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('home feature stories keep distinct editorial treatments and responsive columns',()=>{
  const source=read('../components/FeaturedStories.tsx');
  const css=read('../app/globals.css');

  for(const theme of ['weekend','indoor','oshi','free','experience','kids']){
    assert.match(source,new RegExp(`theme:'${theme}'`));
    assert.match(css,new RegExp(`\\.featured-story-${theme} \\.featured-story-visual`));
  }

  assert.match(css,/\.featured-story-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.featured-story-grid\{grid-template-columns:1fr\}/);
});

test('home PR slot behaves as a real sponsor surface even without an image',()=>{
  const source=read('../components/HomePrSlot.tsx');

  assert.match(source,/NEXT_PUBLIC_HOME_PR_URL/);
  assert.match(source,/NEXT_PUBLIC_HOME_PR_IMAGE_URL/);
  assert.match(source,/PARTNER SPACE/);
  assert.match(source,/AD \/ PARTNER/);
  assert.match(source,/rel="sponsored noreferrer"/);
  assert.match(source,/SUMION合同会社/);
});

test('brand icon keeps the hidden five taps in five seconds admin entrance',()=>{
  const source=read('../components/BrandNav.tsx');

  assert.match(source,/now-time<=5000/);
  assert.match(source,/tapTimes\.current\.length>=5/);
  assert.match(source,/router\.push\('\/admin'\)/);
});


test('home search exposes arbitrary date selection and preserves it in pagination',()=>{
  const filters=read('../components/EventFilters.tsx');
  const page=read('../app/page.tsx');
  const css=read('../app/globals.css');

  assert.match(filters,/\['custom','日付指定'\]/);
  assert.match(filters,/name="from"/);
  assert.match(filters,/name="to"/);
  assert.match(page,/resolveDateRange\(dateMode,customStartRaw,customEndRaw\)/);
  assert.match(page,/from:dateMode==='custom'\?range\.startDate/);
  assert.match(page,/to:dateMode==='custom'/);
  assert.match(css,/input\[value="custom"\]:checked/);
});


test('rainy-day shortcut combines indoor and family-safe filters',()=>{
  const filters=read('../components/EventFilters.tsx');
  const page=read('../app/page.tsx');
  const stories=read('../components/FeaturedStories.tsx');

  assert.match(filters,/name="rainy"/);
  assert.match(filters,/雨の日の室内遊び/);
  assert.match(page,/rainyDayOnly = one\(params\.rainy\) === '1'/);
  assert.match(page,/indoorOnly: indoorOnly \|\| rainyDayOnly/);
  assert.match(page,/familyFriendlyOnly \|\| rainyDayOnly/);
  assert.match(page,/excludeAdultOriented: excludeAdultOriented \|\| rainyDayOnly/);
  assert.match(page,/rainy:rainyDayOnly\?'1':undefined/);
  assert.match(stories,/\?when=today&rainy=1/);
});


test('experience search supports broad and specific hands-on genres',()=>{
  const events=read('../lib/events.ts');
  const filters=read('../components/EventFilters.tsx');
  const page=read('../app/page.tsx');

  assert.match(events,/\['experience','体験・ものづくり'\]/);
  for(const key of [
    'experience_gem','experience_fishing','experience_glass','experience_ring',
    'experience_pottery','experience_food','experience_farm','experience_animal',
    'experience_science','experience_traditional','experience_factory','experience_outdoor'
  ]){
    assert.ok(events.includes(`['${key}'`),`missing experience taxonomy: ${key}`);
  }
  assert.match(filters,/name="experience"/);
  assert.match(filters,/体験をすべて見る/);
  assert.match(page,/const experience = one\(params\.experience\)/);
  assert.match(page,/categories: experience \? \[experience\] : category \? \[category\] : undefined/);
  assert.match(page,/experience:experience\|\|undefined/);
});


test('search form keeps common filters visible and advanced filters collapsible',()=>{
  const filters=read('../components/EventFilters.tsx');
  const css=read('../app/globals.css');

  assert.match(filters,/すぐ使える条件/);
  assert.match(filters,/もっと細かく絞り込む/);
  assert.match(filters,/advancedCount/);
  assert.match(filters,/open=\{advancedOpen\}/);
  assert.match(filters,/条件をクリア/);
  assert.match(css,/\.search-submit-row\{position:sticky/);
  assert.match(css,/font-size:16px/);
});

test('home discovery includes direct experience and child-first shortcuts',()=>{
  const source=read('../components/FeaturedStories.tsx');
  assert.match(source,/experience=experience/);
  assert.match(source,/childFocus=1/);
  assert.match(source,/宝石探し、釣り、ガラス細工、指輪作り/);
});
