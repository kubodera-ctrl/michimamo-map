const assert = require('assert');
const fs = require('fs');
const path = require('path');

const privacy = fs.readFileSync(path.join(__dirname, '..', 'privacy.html'), 'utf8');
const terms = fs.readFileSync(path.join(__dirname, '..', 'terms.html'), 'utf8');

for (const value of [
  'β利用状況',
  '最終利用時刻',
  '未認証利用者をこの利用状況集計へ登録しません',
  'β障害情報',
  'IPアドレスそのものは本機能のアプリログへ記録しません',
  '現在、広告利用によるまちまもポイント還元は実施していません'
]) {
  assert(privacy.includes(value), `privacy runtime disclosure missing: ${value}`);
}

for (const value of [
  'β版ではポイント交換の受付・承認・発行処理を停止しています',
  '広告利用によるまちまもポイント還元は、別途明示して有効化するまで実施しません'
]) {
  assert(terms.includes(value), `terms beta-state disclosure missing: ${value}`);
}

assert(privacy.includes('最終改定日：2026年9月29日'));
assert(terms.includes('最終改定日：2026年9月29日'));

console.log('beta legal/runtime alignment gate: PASS');
