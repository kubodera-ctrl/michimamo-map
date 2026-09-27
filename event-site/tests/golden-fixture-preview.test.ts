import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/preview/carousel-golden-fixtures/page.tsx',import.meta.url),'utf8');

test('Golden fixture preview is synthetic noindex and disabled when indexing is enabled',()=>{
  assert.match(source,/PREVIEW ONLY \/ SYNTHETIC DATA/);
  assert.match(source,/robots:\{index:false,follow:false\}/);
  assert.match(source,/NEXT_PUBLIC_ALLOW_INDEXING==='true'/);
  assert.match(source,/notFound\(\)/);
  assert.match(source,/normal-5p/);
  assert.match(source,/extended-7p/);
  assert.match(source,/holiday-8p/);
  assert.match(source,/pageCount:5/);
  assert.match(source,/pageCount:7/);
  assert.match(source,/pageCount:8/);
});
