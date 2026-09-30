const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260929231903_beta_edge_rate_limit.sql'),
  'utf8'
);
const lineAuth = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'line-auth', 'index.ts'),
  'utf8'
);
const errorLog = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'client-error-log', 'index.ts'),
  'utf8'
);

assert(migration.includes('app_private.edge_rate_limit_buckets'));
assert(migration.includes("auth.role() <> 'service_role'"));
assert(/revoke all on function public\.consume_edge_rate_limit[\s\S]*from public, anon, authenticated;/i.test(migration));
assert(/grant execute on function public\.consume_edge_rate_limit[\s\S]*to service_role;/i.test(migration));
assert(!/\bip\s+(text|inet)\b/i.test(migration), 'raw IP must not be stored');

assert(lineAuth.includes("'consume_edge_rate_limit'"));
assert(lineAuth.includes("p_scope: 'line-auth'"));
assert(lineAuth.includes('p_limit: 10'));
assert(lineAuth.includes('p_window_seconds: 60'));
assert(lineAuth.includes("'line-auth-rate-limit:' + LINE_CHANNEL_SECRET + ':' + ip"));

assert(errorLog.includes("'consume_edge_rate_limit'"));
assert(errorLog.includes("p_scope: 'client-error-log'"));
assert(errorLog.includes('p_limit: 20'));
assert(errorLog.includes('p_window_seconds: 60'));

console.log('beta edge rate-limit contract: PASS');
