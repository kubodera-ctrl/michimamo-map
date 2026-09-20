const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const safety=fs.readFileSync(path.join(root,'lp-safety.html'),'utf8');
const point=fs.readFileSync(path.join(root,'lp-point.html'),'utf8');

test('safety LP treats local anomaly reporting as a current feature',()=>{
  assert.match(safety,/>地域の異変<\/h3>/);
  assert.doesNotMatch(safety,/地域の異変[^\n]{0,120}準備中/);
  assert.match(safety,/道路の破損・倒木・冠水・不法投棄/);
});

test('point LP describes exchange as planned, not currently live',()=>{
  assert.match(point,/ポイント交換は正式提供予定/);
  assert.match(point,/30,000pt/);
  assert.match(point,/3,000円分/);
  assert.match(point,/50,000pt/);
  assert.match(point,/5,000円分/);
  assert.match(point,/β版では交換受付を停止/);
  assert.match(point,/正式契約後に確定/);
});

test('point LP does not embed unapproved payout brand logos',()=>{
  assert.doesNotMatch(point,/<img[^>]+(?:paypay|amazon|rakuten)/i);
});
