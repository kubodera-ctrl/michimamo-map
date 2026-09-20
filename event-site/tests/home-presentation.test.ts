import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('home feature stories keep distinct editorial treatments and responsive columns',()=>{
  const source=read('../components/FeaturedStories.tsx');
  const css=read('../app/globals.css');

  for(const theme of ['weekend','indoor','oshi','free']){
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
