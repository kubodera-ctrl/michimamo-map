const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(html.includes('RANKING_DEMO_USERS'), 'ranking demo users must be defined');
assert(html.includes('isDemo:true'), 'demo ranking rows must carry explicit identity');
assert(html.includes('DEMO</span>'), 'every demo row must render a visible DEMO badge');
assert(html.includes('ランキングには表示確認用のDEMOユーザーを含みます'), 'ranking must disclose demo users');
assert(html.includes('実ユーザー内 <span id="rankMyPosDisp">'), 'own rank must be identified as real-user-only');
assert(html.includes('const allUsers = [];'), 'real ranking users must still come from the RPC');
assert(html.includes('const rankingUsers = [...uniqueUsers, ...RANKING_DEMO_USERS]'), 'real and demo users may be shown together');
assert(html.includes('const areaCount = realDataCount;'), 'monthly area ranking must remain real reports only');
assert(html.includes('前月の該当報告はありません'), 'monthly area empty state must remain truthful');
assert(!html.includes('AREA_SAMPLE_ALL'), 'area synthetic fallback must not return');
assert(!html.includes('sampleMode'), 'synthetic area sample mode must not return');

for (const evidence of [
  '61,736','48,620','2,148','2,064','全国47都道府県',
  '2026/10/1時点・公開DB実数','福岡県 福岡市','1,124件',
  '東京都 大田区','515件'
]) {
  assert(html.includes(evidence), `verified real-data snapshot must remain rendered: ${evidence}`);
}

console.log('beta demo-user ranking + real-data coverage gate: PASS');
