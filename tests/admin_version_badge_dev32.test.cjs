const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');

test('admin heading carries an always-visible v32 badge',()=>{
  assert.match(html,/【管理者専用】運営管理<\/span><span id="releaseVersionBadge"/);
  assert.match(html,/data-release="dev32-20260920"/);
  assert.match(html,/>v32<\/span><\/h2>/);
  assert.doesNotMatch(html,/管理画面バージョン：開発32｜更新 2026年9月20日<\/div>/);
});
