const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '../supabase/migrations/20260927150000_asp_runtime_master.sql');
const sql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();

for (const table of ['asp_runtime_offers', 'asp_runtime_service_offers', 'asp_runtime_placements', 'asp_runtime_clicks']) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\s*\\(`), `${table} table exists`);
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`), `${table} RLS is on`);
  assert.match(sql, new RegExp(`public\\.${table}`), `${table} is listed in direct-access revocation`);
}
assert.match(sql, /revoke all on public\.asp_runtime_offers, public\.asp_runtime_service_offers,[\s\S]*?from public, anon, authenticated/);

assert.match(sql, /offer_id text primary key/);
assert.match(sql, /unique \(asp, program_id\)/);
assert.match(sql, /production_listing_approved boolean not null default false/);
assert.match(sql, /publish_status text not null default 'draft'/);
assert.match(sql, /listing_enabled boolean not null default false/);
assert.match(sql, /check \(not point_reward_allowed or \([\s\S]*?reward_rule_confirmed[\s\S]*?reward_amount is not null or reward_rate is not null[\s\S]*?reward_rule <> '\{\}'::jsonb/);
assert.match(sql, /creative_type in \('text','image'\)/);
assert.match(sql, /web_approval_status = 'approved'/);
assert.match(sql, /source_listing_allowed/);
assert.match(sql, /source_media_approved/);
assert.match(sql, /and s\.production_listing_approved/);
assert.match(sql, /s\.tracking_url is not null/);
assert.match(sql, /s\.publish_status = 'active'/);
assert.match(sql, /and p\.enabled/);
assert.match(sql, /impression_tracking_url text/);
assert.match(sql, /point_reward_allowed and s\.reward_rule_confirmed/);
assert.match(sql, /p_offer_id text/);
assert.match(sql, /p_service_key text/);
assert.match(sql, /p_placement_id text/);
assert.match(sql, /p_anonymous_session_id uuid/);
assert.match(sql, /auth\.uid\(\)/);
assert.match(sql, /raw html tags are not accepted/);
assert.match(sql, /v_offer_id !~ '\^\[a-za-z0-9\]\[a-za-z0-9\._:-\]\{0,119\}\$'/);
assert.match(sql, /perform public\.admin_validate\(p_password\)/);
assert.match(sql, /insert into public\.admin_audit_log/);
assert.match(sql, /set search_path = ''/);
assert.doesNotMatch(sql, /grant (?:select|insert|update|delete|all) on public\.asp_runtime_[\s\S]{0,200} to (?:anon|authenticated)/);

console.log('PASS: ASP runtime master has isolated service approvals, fail-closed publishing/reward gates, admin RPCs, and click audit schema');
