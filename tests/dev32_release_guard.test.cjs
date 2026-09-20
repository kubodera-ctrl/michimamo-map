const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const safety=fs.readFileSync(path.join(root,'lp-safety.html'),'utf8');
const roadmap=fs.readFileSync(path.join(root,'ROADMAP.md'),'utf8');

test('development 32 release badge is the production discriminator',()=>{
  assert.match(html,/data-release="dev32-20260920"/);
  assert.match(html,/管理画面バージョン：開発32｜更新 2026年9月20日/);
});

test('accident hotspot beta UI cannot show random or unverified year-mixed data',()=>{
  assert.doesNotMatch(html,/const accidentCount = Math\.floor\(Math\.random\(\)/);
  assert.doesNotMatch(html,/accident-hotspots\.js\?v=32-npa2/);
  assert.match(html,/id="accidentAreaToggle"[^>]+hidden[^>]+aria-hidden="true"/);
  assert.match(html,/事故多発エリア（再集計中）/);
  assert.match(safety,/事故多発エリア[^<]*<span[^>]*>再集計中<\/span>/);
  assert.match(safety,/β版では一時非表示/);
});

test('roadmap reflects current exchange and Extra quiz contracts',()=>{
  assert.doesNotMatch(roadmap,/銀行振込は金融機関、支店、口座種別、口座番号/);
  assert.match(roadmap,/デジタルギフト®を第一候補/);
  assert.match(roadmap,/EXTRAは100問・各5秒・98\/100以上/);
  assert.doesNotMatch(roadmap,/EXTRAは100問・各10秒/);
});
