const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'data/quiz_dev27/quiz_questions_430.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260917002422_quiz_stamps_dev27.sql'), 'utf8');

assert.equal(bank.questions.length, 430);
assert.deepEqual(
  bank.questions.reduce((n, q) => ({...n, [q.vehicleType]:(n[q.vehicleType] || 0) + 1}), {}),
  {car:215, bicycle:215}
);
assert.equal(new Set(bank.questions.map(q => q.id)).size, 430, 'question ids must be unique');
assert.equal(new Set(bank.questions.map(q => q.question.trim())).size, 430, 'exact question text must be unique');
for (const q of bank.questions) {
  assert.equal(q.choices.length, 3, `${q.id}: must have three choices`);
  assert.ok(q.choices.some(c => c.value === q.correctValue), `${q.id}: answer must exist`);
  if (q.visualRef) {
    assert.equal(q.visualRef.assetNeeded, false, `${q.id}: visual must not depend on a missing asset`);
    assert.equal(q.visualRef.renderer, 'inline_svg_v1', `${q.id}: visual renderer missing`);
  }
}
assert.equal(bank.questions.filter(q => q.id >= 'CAR-201' && q.id <= 'CAR-215').length, 15);
assert.equal(bank.questions.filter(q => q.id >= 'BIKE-201' && q.id <= 'BIKE-215').length, 15);

assert.match(html, /id="mypageQuizStamps"/);
assert.match(html, /id="mypageLoginStamps"/);
assert.match(html, /id="mypageAedStamps"/);
assert.equal((html.match(/<details[^>]*class="card activity-fold"/g) || []).length, 6);
assert.match(html, /今週の利用日数 \$\{days\}\/7日/);
assert.match(html, /startQuizSession\('extra'\)/);

assert.match(sql, /weekly_stamp_events/);
assert.match(sql, /aed_stamp_events/);
assert.match(sql, /weekly_quiz_stamp_reward/);
assert.match(sql, /if earned<5 then perform public\.apply_point_transaction\(u,1,'spot_like'/);
assert.match(sql, /if n<5 then perform public\.apply_point_transaction\(new\.created_by,1,'spot_post'/);
assert.doesNotMatch(sql, /__QUIZ_BANK_JSON__/);

console.log('PASS: dev27 bank, image renderer metadata, stamp rules, and compact My Page');
