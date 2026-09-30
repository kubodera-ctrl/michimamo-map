const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

for (const forbidden of [
  'RANKING_SAMPLE_USERS',
  'AREA_SAMPLE_ALL',
  'RANKING_SAMPLE_MIN_REAL_USERS',
  'AREA_SAMPLE_MIN_REAL_REPORTS',
  'sampleMode',
  'isSample:true',
  '参考表示',
  '>サンプル</span>'
]) {
  assert(!html.includes(forbidden), `synthetic ranking fallback must not ship: ${forbidden}`);
}

assert(html.includes('const allUsers = [];'), 'national ranking must be based on real RPC data only');
assert(html.includes('const areaCount = realDataCount;'), 'monthly area ranking must use real reports only');
assert(html.includes('前月の該当報告はありません'), 'sparse monthly data needs a truthful empty state');
assert(html.includes('const PREFECTURES = ['), 'prefecture filter must remain available without synthetic city data');

for (const evidence of [
  '61,736',
  '48,620',
  '2,148',
  '2,064',
  '全国47都道府県',
  '2026/10/1時点・公開DB実数',
  '福岡県 福岡市',
  '1,124件',
  '東京都 大田区',
  '515件'
]) {
  assert(html.includes(evidence), `verified real-data snapshot must be rendered: ${evidence}`);
}

console.log('beta real-data-only ranking and verified coverage snapshot gate: PASS');
