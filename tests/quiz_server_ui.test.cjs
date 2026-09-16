const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
for (const [, code] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(code);
const code = html.slice(html.indexOf('        let qIdx = 0;'), html.indexOf('    async function playGacha()'));
function element() {
  return { style: {}, children: [], classList: { add() {} },
    set innerHTML(v) { this.children = []; }, appendChild(b) { this.children.push(b); } };
}
const els = new Map();
const document = {
  getElementById(id) { if (!els.has(id)) els.set(id, element()); return els.get(id); },
  createElement: element,
  querySelectorAll() { return document.getElementById('quizOptions').children; }
};
const question = { q: 'Question', o: ['A', 'B', 'C'] };
let call, requests = [], toast;
const context = vm.createContext({ document, myPoint: 0,
  db: { async rpc(name, args) { requests.push({ name, args }); return call(name, args); } },
  requireAuthenticatedUser: async () => ({ id: 'user' }),
  localStorage: { setItem() {} }, updateMyPage() {}, showToast(t) { toast = t; }
});
vm.runInContext(code, context);
const run = src => vm.runInContext(src, context);
(async () => {
  call = async () => ({ data: { session_id: 'session', question } });
  await run("startQuizSession('mix')");
  assert.equal(document.querySelectorAll().length, 3);
  run('nextQuestion()');
  assert.equal(run('qIdx'), 0, 'cannot skip an unanswered question');
  call = async () => ({ error: { message: 'Network failure' } });
  await run('ansQ(1)');
  assert.equal(document.querySelectorAll()[1].disabled, false);
  assert.equal(document.querySelectorAll()[0].disabled, true);
  const before = requests.length;
  await run('ansQ(2)');
  assert.equal(requests.length, before, 'retry cannot change a possibly committed answer');
  call = async () => ({ data: { index: 0, correct: true, answer: 1, score: 1,
    explanation: 'Explanation', complete: false, next_question: question } });
  await run('ansQ(1)');
  await run('ansQ(1)');
  assert.equal(requests.length, before + 1, 'double tap does not resubmit accepted answer');
  run('nextQuestion(); nextQuestion()');
  assert.equal(run('qIdx'), 1);
  let resolveAnswer;
  call = () => new Promise(resolve => { resolveAnswer = resolve; });
  const pending = run('ansQ(0)');
  run('backToQuizMenu()');
  resolveAnswer({ data: { score: 10, complete: true, awarded: 10, balance: 10 } });
  await pending;
  assert.equal(run('quizReceipt'), null, 'late response cannot revive a closed quiz');
  call = async () => ({ data: { session_id: 'session2', question } });
  await run("startQuizSession('car')");
  for (let i = 0; i < 10; i++) {
    call = async () => ({ data: { index: i, correct: true, answer: 0, score: i + 1,
      explanation: 'Explanation', complete: i === 9, next_question: question,
      awarded: i === 9 ? 10 : 0, balance: i === 9 ? 10 : null, already_claimed: false } });
    await run('ansQ(0)'); run('nextQuestion()');
  }
  assert.equal(document.getElementById('resultScore').innerText, '10 / 10');
  assert.equal(run('myPoint'), 10);
  assert.equal(document.getElementById('quizResultArea').style.display, 'block');
  assert.ok(requests.every(r => r.name !== 'claim_quiz_points'));
  console.log('PASS: inline syntax, progression, failed-response retry, duplicate taps, late response, full 10-question result');
})().catch(e => { console.error(e); process.exitCode = 1; });
