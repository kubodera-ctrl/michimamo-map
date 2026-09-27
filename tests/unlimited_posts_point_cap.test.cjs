const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

test('posting stays available after the daily point cap',()=>{
  assert.doesNotMatch(html,/本日の安全ポイント獲得（投稿）は5回まで/);
  assert.doesNotMatch(html,/if \(cat !== 'aed' && actionLimits\.postCount >= 5\)/);
  assert.match(html,/投稿自体は回数制限しない。ポイント付与上限（1日5pt）はDB側で判定する/);
  assert.match(html,/本日の投稿ポイント上限到達のため0pt/);
});
