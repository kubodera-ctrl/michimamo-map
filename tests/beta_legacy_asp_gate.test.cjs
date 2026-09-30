const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const forbidden = [
  'px.a8.net',
  'www14.a8.net',
  'www16.a8.net',
  'ck.jp.ap.valuecommerce.com',
  'ad.jp.ap.valuecommerce.com',
  '＋10,000 pt',
  '＋500,000 pt',
  '広告主の承認完了後',
  '4BAH9J+CY6GZM+43U8+BWVTE'
];

for (const value of forbidden) {
  assert(!html.includes(value), `legacy ASP material must stay disabled: ${value}`);
}

assert(html.includes('id="betaAdEmptyState"'), 'beta ad empty state must remain visible');
assert(html.includes('現在公開中の案件はありません。'), 'beta ad empty state must explain zero publishable offers');
assert(html.includes('掲載条件の確認が完了した駐車場サービスのみ'), 'parking modal must remain fail-closed');
assert(html.includes('const dynamicAdList = [];'), 'legacy dynamic ad candidates must remain empty');

for (const marker of [
  'data-view="mapView"',
  'data-view="quizView"',
  'data-view="aboutView"',
  'data-view="poikatsuView"',
  'id="pointExchangeModal"',
  'id="postModal"',
  'id="wbgtModal"'
]) {
  assert(html.includes(marker), `unrelated core UI marker missing: ${marker}`);
}

console.log('beta legacy ASP gate: PASS');
