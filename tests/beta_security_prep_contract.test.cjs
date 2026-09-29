const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const rateMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260929130000_beta_edge_rate_limit.sql'),
  'utf8'
);
const rankingMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260929130500_safe_profile_ranking.sql'),
  'utf8'
);
const lineAuth = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'line-auth', 'index.ts'),
  'utf8'
);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert(
  rateMigration.includes('app_private.edge_rate_limit_buckets'),
  'persistent rate-limit table must stay private'
);
assert(
  rateMigration.includes("auth.role() <> 'service_role'"),
  'rate-limit RPC must require service_role'
);
assert(
  /revoke all on function public\.consume_edge_rate_limit[\s\S]*from public, anon, authenticated;/i.test(rateMigration),
  'rate-limit RPC must be revoked from public browser roles'
);
assert(
  /grant execute on function public\.consume_edge_rate_limit[\s\S]*to service_role;/i.test(rateMigration),
  'rate-limit RPC must be callable only by service_role'
);
assert(
  !/\bip\s+(text|inet)\b/i.test(rateMigration),
  'persistent limiter must not store raw IP addresses'
);

assert(
  lineAuth.includes("'consume_edge_rate_limit'"),
  'LINE auth must use the shared persistent limiter'
);
assert(
  lineAuth.includes("p_scope: 'line-auth'") &&
    lineAuth.includes('p_limit: 10') &&
    lineAuth.includes('p_window_seconds: 60'),
  'LINE auth persistent limit must remain 10 requests/minute'
);
assert(
  lineAuth.includes("'line-auth-rate-limit:' + LINE_CHANNEL_SECRET + ':' + ip"),
  'LINE auth must key-hash the client IP before persistence'
);
assert(
  lineAuth.includes("console.error('line_auth_internal_error')"),
  'LINE auth failures need a fixed safe central log code'
);
assert(
  !/console\.(log|error|warn)\([^\n]*(login_code|state|token|auth_id|\bip\b)/i.test(lineAuth),
  'LINE auth must not log OAuth/session secrets or raw IPs'
);

assert(
  rankingMigration.includes('is_me boolean'),
  'ranking RPC must expose is_me instead of raw profile UUID'
);
assert(
  !/returns table\s*\(\s*id uuid/i.test(rankingMigration),
  'ranking RPC must not return profile UUID'
);
assert(
  rankingMigration.includes('coalesce(p.auth_id = auth.uid(), false)'),
  'ranking is_me must be derived server-side'
);
assert(
  !html.includes('id: p.id'),
  'ranking UI must not depend on public profile UUID'
);
assert(
  html.includes('isMe: p.is_me === true') &&
    html.includes('if (u.isMe) myRankPos'),
  'ranking UI must highlight the current user using is_me'
);

console.log('beta security prep contract: PASS');
