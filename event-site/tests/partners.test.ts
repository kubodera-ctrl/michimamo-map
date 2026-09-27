import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('partner overview explains beta status and nationwide data strategy',()=>{
  const page=read('../app/partners/page.tsx');
  assert.match(page,/β公開準備中/);
  assert.match(page,/全国対応を開発中/);
  assert.match(page,/SUMION合同会社/);
  assert.match(page,/API \/ RSS \/ オープンデータ \/ 公式イベントURL/);
  assert.match(page,/自動取得＝自動公開にはしない/);
  assert.match(page,/画像は許諾前提/);
  assert.match(page,/推測で埋めない/);
  assert.match(page,/料金・契約条件/);
});

test('partner overview stays out of search indexes during outreach',()=>{
  const page=read('../app/partners/page.tsx');
  assert.match(page,/robots:\{index:false,follow:true\}/);
});

test('partner overview is reachable from the localized public footer',()=>{
  const layout=read('../app/layout.tsx');
  const i18n=read('../lib/i18n.ts');
  assert.match(layout,/localePath\('\/partners',locale\)/);
  assert.match(layout,/messages\.about/);
  assert.match(i18n,/about:'まちイベについて'/);
});
