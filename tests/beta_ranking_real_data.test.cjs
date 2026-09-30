const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

for (const value of [
  'パトロールおじさん',
  '安全第一丸',
  'ご近所ウォッチャー',
  'セーフティライダー',
  'let dummies =',
  'Math.random()*5',
  'const prefCities ='
]) {
  assert(!html.includes(value), `synthetic ranking material must not ship: ${value}`);
}

assert(html.includes('let allUsers = [];'), 'national ranking must start from real data only');
assert(html.includes('const areaCount = realDataCount;'), 'area ranking must use real data only');
assert(html.includes('ランキングデータはまだありません'), 'empty national ranking needs a truthful empty state');

console.log('beta real-data-only ranking gate: PASS');
