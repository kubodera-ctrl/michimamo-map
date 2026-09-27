const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(html, /onclick="openPointExchange\(\)"/);
assert.match(html, /id="pointExchangeModal"/);
assert.match(html, /30,000pt → 3,000円相当/);
assert.match(html, /50,000pt → 5,000円相当/);
assert.match(html, /value="paypay"/);
assert.match(html, /value="bank"/);
assert.match(html, /id="guardianFields"/);
assert.match(html, /id="guardianConsent"/);
assert.match(html, /id="guardianSignature"/);
assert.match(html, /id="bankAccountHolder"/);
assert.match(html, /本人名義、または上記で同意した保護者名義/);
assert.match(html, /現在はベータ版のため、ポイント交換申請は受け付けていません/);
assert.match(html, /入力内容は保存・送信されていません/);

const submitStart = html.indexOf('function submitPointExchangeBeta');
const submitEnd = html.indexOf('\n    }', submitStart);
assert.ok(submitStart >= 0 && submitEnd > submitStart);
const submitBody = html.slice(submitStart, submitEnd);
assert.doesNotMatch(submitBody, /\bfetch\s*\(|\.from\s*\(|localStorage|sessionStorage|\.rpc\s*\(/);

console.log('PASS: beta point exchange flow has complete fields, guardian consent and a non-persisting disabled submission.');
