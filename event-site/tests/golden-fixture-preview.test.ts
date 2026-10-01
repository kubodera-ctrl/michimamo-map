import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GOLDEN_FIXTURES,goldenFixtureById} from '../lib/machiibe-golden-fixtures';

const indexSource=fs.readFileSync(new URL('../app/preview/carousel-golden-fixtures/page.tsx',import.meta.url),'utf8');
const detailSource=fs.readFileSync(new URL('../app/preview/carousel-golden-fixtures/[fixture]/page.tsx',import.meta.url),'utf8');
const rendererSource=fs.readFileSync(new URL('../components/MachiibeFinalCarouselRenderer.tsx',import.meta.url),'utf8');

test('Golden fixture preview stays synthetic, noindex and disabled when indexing is enabled',()=>{
  assert.match(indexSource,/PREVIEW ONLY \/ SYNTHETIC DATA/);
  assert.match(indexSource,/robots:\{index:false,follow:false\}/);
  assert.match(indexSource,/NEXT_PUBLIC_ALLOW_INDEXING==='true'/);
  assert.match(indexSource,/notFound\(\)/);
  assert.equal(GOLDEN_FIXTURES.length,3);
});

test('fixed iPhone QA routes expose NORMAL 5P, EXTENDED 7P and HOLIDAY 8P',()=>{
  assert.deepEqual(
    GOLDEN_FIXTURES.map((item)=>[item.id,item.pageCount]),
    [['normal-5p',5],['extended-7p',7],['holiday-8p',8]]
  );
  assert.equal(goldenFixtureById('normal-5p')?.label,'NORMAL 5P');
  assert.equal(goldenFixtureById('extended-7p')?.label,'EXTENDED 7P');
  assert.equal(goldenFixtureById('holiday-8p')?.label,'HOLIDAY 8P');
  assert.match(detailSource,/generateStaticParams/);
  assert.match(detailSource,/全\{item\.pageCount\}ページ/);
  assert.match(detailSource,/GOLDEN確認用/);
});

test('QA labels stay outside the final Canvas renderer',()=>{
  assert.match(detailSource,/文字切れ/);
  assert.match(detailSource,/safe area/);
  assert.match(detailSource,/fact chip/);
  assert.doesNotMatch(rendererSource,/GOLDEN確認用|文字切れ|文字重なり|safe area/);
});

test('final Canvas brand uses the shared official machiibe icon asset',()=>{
  assert.match(rendererSource,/loadImage\('\/machiibe-icon\.svg'\)/);
  assert.match(rendererSource,/ctx\.drawImage\(icon,/);
  assert.match(rendererSource,/await brand\(ctx,/);
});

test('cover period pill is width-aware and keeps a fixed right safe area',()=>{
  assert.match(rendererSource,/function periodPill/);
  assert.match(rendererSource,/maxWidth=500/);
  assert.match(rendererSource,/minSize=18/);
  assert.match(rendererSource,/const x=W-right-width/);
  assert.match(rendererSource,/periodPill\(ctx,input\.period\.periodLabel\)/);
  assert.doesNotMatch(rendererSource,/rounded\(ctx,650,105,360,82/);
});
