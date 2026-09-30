const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert(html.includes('RANKING_SAMPLE_MIN_REAL_USERS = 6'), 'sample users must auto-retire once six real users exist');
assert(html.includes('AREA_SAMPLE_MIN_REAL_REPORTS = 10'), 'area samples must auto-retire once ten real reports exist');
assert(html.includes('RANKING_SAMPLE_USERS'), 'transparent sample ranking fallback must exist');
assert(html.includes('実利用者・実績とは別の参考表示です'), 'national ranking reference data must be disclosed once at card level');
assert(html.includes('下記件数は実績ではありません'), 'area sample counts must be explicitly labeled');
assert(html.includes('const sampleMode = realUsers.length < RANKING_SAMPLE_MIN_REAL_USERS'), 'national sample threshold must depend on real users');
assert(html.includes('const sampleMode = totalRealCount < AREA_SAMPLE_MIN_REAL_REPORTS'), 'area sample threshold must depend on real report volume');
assert(!html.includes('Math.random()*5'), 'sample area values must be deterministic, not random');
assert(html.includes('const prefCities ='), 'prefecture selector catalog must be defined');
assert(html.includes("isSample:true"), 'reference rows must retain internal sample identity');
assert(!html.includes('>サンプル</span>'), 'per-row sample badges must not be rendered');
assert(html.includes('<strong>参考表示</strong>'), 'area reference disclosure must use compact wording');

console.log('beta truthful sample-ranking gate: PASS');
