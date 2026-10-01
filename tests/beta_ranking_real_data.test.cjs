const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(html.includes('RANKING_DEMO_USERS'), 'demo users must remain in user ranking');
assert(html.includes('DEMO</span>'), 'demo users and demo count areas must be visibly labeled');
assert(html.includes('表示確認用のDEMOユーザー'), 'user ranking must disclose demo users');
assert(html.includes('AREA_DEMO_ALL'), 'two count ranking areas must have demo counts');
assert(html.includes('areaDemoRows'), 'prefecture/category demo counts must be deterministic');
assert(html.includes('β表示確認用の件数です'), 'area count ranking must disclose demo counts');
assert(html.includes('大阪府 大阪市'), 'designated-city-heavy demo ordering must include Osaka City');
assert(html.includes('神奈川県 横浜市'), 'designated-city-heavy demo ordering must include Yokohama');
assert(html.includes('埼玉県 さいたま市'), 'designated-city-heavy demo ordering must include Saitama City');
assert(html.includes('兵庫県 神戸市'), 'designated-city-heavy demo ordering must include Kobe');
assert(html.includes('福岡県 福岡市'), 'designated-city-heavy demo ordering must include Fukuoka City');
assert(html.includes('const prefCities ='), 'all prefecture demo views must retain city catalog');
assert(!html.includes('Math.random()*5'), 'demo counts must be deterministic, not random');

for (const evidence of [
  '61,736','48,620','2,148','2,064','全国47都道府県','2026/10/1時点・公開DB実数'
]) {
  assert(html.includes(evidence), `verified national real-data snapshot must remain rendered: ${evidence}`);
}

console.log('beta DEMO user + DEMO count ranking with real national metrics gate: PASS');
