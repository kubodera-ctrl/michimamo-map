const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(m => m[0]);
const unlabeledIconOnly = buttons.filter(button => {
  const text = button
    .replace(/^<button\b[^>]*>/i, '')
    .replace(/<\/button>$/i, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return !text && !/\baria-label\s*=/.test(button) && !/\btitle\s*=/.test(button);
});
assert.deepStrictEqual(unlabeledIconOnly, [], 'icon-only buttons require an accessible name');

const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
const missingAlt = images.filter(image => !/\balt\s*=/.test(image));
assert.deepStrictEqual(missingAlt, [], 'all images require alt text, including empty alt for decorative images');

for (const value of [
  'aria-label="場所を検索"',
  'aria-label="現在地へ移動"',
  'aria-label="地域ランキングの都道府県"',
  'aria-label="地域の異変の種類"',
  'aria-label="投稿の種類"',
  'aria-label="投稿タイトル"',
  'aria-label="投稿コメント"'
]) {
  assert(html.includes(value), `critical accessible label missing: ${value}`);
}

console.log('beta accessibility static gate: PASS');
