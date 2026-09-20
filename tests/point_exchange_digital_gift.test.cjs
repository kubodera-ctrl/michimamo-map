const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'point-exchange.js'), 'utf8');
const service = fs.readFileSync(path.join(root, 'exchange-service.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260920100000_point_exchange_digital_gift.sql'), 'utf8');

test('Digital Gift is the main exchange path and account identifiers are not collected', () => {
  assert.match(ui, /デジタルギフトで交換/);
  assert.match(ui, /PayPayマネーライト/);
  assert.match(ui, /正式提供時の交換先例/);
  for (const forbidden of ['bankAccountNumber', 'bankInstitution', 'PayPay IDを入力']) {
    assert.equal(ui.includes(forbidden), false, forbidden);
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

test('beta submit cannot call request RPC or provider issue', () => {
  const submitBody = ui.match(/function submitBeta\(event\) \{([^}]+)\}/)?.[1] || '';
  assert.match(submitBody, /BETA_MESSAGE/);
  assert.doesNotMatch(submitBody, /request\(|\.rpc\(|issue\(/);
  assert.match(service, /digital_gift_api_not_connected/);
  assert.match(migration, /exchange_beta_closed/);
  assert.match(migration, /exchange_enabled boolean not null default false/);
  assert.match(migration, /processing_enabled boolean not null default false/);
});

test('reservation and issue paths are idempotent and ledger compatible', () => {
  assert.match(migration, /unique \(user_id, idempotency_key\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /points_reserved/);
  assert.match(migration, /point_exchange_requests_external_issue_uidx/);
  assert.match(migration, /apply_point_transaction\(v_request\.user_id,-v_request\.points,'point_exchange',v_request\.id::text\)/);
  assert.match(migration, /points_committed_at is null/);
});

test('brand assets require approved status and HTTPS URL', () => {
  assert.match(ui, /provider\.status === 'approved'/);
  assert.match(migration, /status = 'approved' and logo_url ~ '\^https:\/\/'/);
  assert.equal(/logo_url[^\n]+https:\/\/(paypay|amazon|rakuten)/i.test(migration), false);
});

test('history and admin management surfaces are mounted', () => {
  assert.match(html, /pointExchangeHistoryArea/);
  assert.match(html, /adminPointExchangeArea/);
  assert.match(html, /MachimamoPointExchange\?\.loadAdmin/);
  assert.match(ui, /ギフトを受け取る/);
});
