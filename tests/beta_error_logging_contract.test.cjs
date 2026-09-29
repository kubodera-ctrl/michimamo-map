const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'beta-error-bootstrap.js'), 'utf8');
const analytics = fs.readFileSync(path.join(root, 'beta-usage-analytics.js'), 'utf8');
const edge = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'client-error-log', 'index.ts'),
  'utf8'
);
const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');

assert(
  html.includes('<script src="beta-error-bootstrap.js?v=38-errors1"></script>'),
  'error bootstrap must load before application runtime'
);
assert(
  html.indexOf('beta-error-bootstrap.js?v=38-errors1') <
    html.indexOf("const map = L.map('map'"),
  'error bootstrap must load before map initialization'
);
assert(
  bootstrap.includes("addEventListener('error'") &&
    bootstrap.includes("addEventListener('unhandledrejection'"),
  'bootstrap must capture global errors and unhandled rejections'
);
assert(
  html.includes("setPhase('map_init')") &&
    html.includes("clearPhase('map_init')"),
  'map initialization must be identifiable in global error events'
);
assert(
  html.includes("kind: 'rpc_failure'") &&
    html.includes("code: 'supabase_rpc_error'"),
  'Supabase RPC failures must be centrally reported'
);
assert(
  html.includes("kind: 'line_auth_failure'") &&
    html.includes("code: 'start_failed'") &&
    html.includes("code: 'exchange_failed'"),
  'LINE auth start/exchange failures must be centrally reported'
);
assert(
  analytics.includes("'/functions/v1/client-error-log'") &&
    analytics.includes('MachimamoBetaError?.attachReporter'),
  'queued browser errors must flush to the client error Edge Function'
);
assert(
  edge.includes("event: 'machimamo_client_error'") &&
    edge.includes("'client-error-log'") &&
    edge.includes('p_limit: 20') &&
    edge.includes('p_window_seconds: 60'),
  'client error logger must use structured safe logs and persistent rate limiting'
);
for (const forbidden of [
  'access_token',
  'refresh_token',
  'login_code',
  'exchange_verifier',
  'provider_user_id',
]) {
  assert(
    !edge.includes(forbidden),
    'client error logger must not handle secret/user fields: ' + forbidden
  );
}
assert(
  privacy.includes('β障害情報') &&
    privacy.includes('入力本文、OAuthコード・トークン、アカウント識別ID、IPアドレスそのものは本機能のアプリログへ記録しません'),
  'privacy policy must disclose the minimal beta error log'
);

console.log('beta error logging contract: PASS');
