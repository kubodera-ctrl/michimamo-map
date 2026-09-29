const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260927190000_local_anomaly_police_safety.sql', 'utf8');

assert.match(html, /<option value="police_safety">警察・防犯に関する情報<\/option>/);
assert.match(html, /police_safety:'警察・防犯に関する情報'/);
assert.match(html, /利用者投稿 · 地域の異変（警察・防犯に関する情報）/);
assert.match(html, /利用者投稿：警察・防犯に関する情報/);
assert.match(html, /official:'公的機関・警察情報'/);
assert.match(migration, /drop constraint if exists spots_anomaly_type_check/);
assert.equal((migration.match(/'police_safety'/g) || []).length, 2, 'CHECK and submit RPC both allow only this new subtype');
assert.match(migration, /cat='local_anomaly'.*atype is null/s, 'RPC validates anomaly subtypes only for user local_anomaly');
assert.match(migration, /cat<>'local_anomaly' and atype is not null/, 'other categories cannot carry the anomaly subtype');
assert.doesNotMatch(migration, /category\s*=\s*'official'[^;]*police_safety/s, 'official police data is not reclassified as a user subtype');
console.log('PASS local police-safety subtype UI, share labeling, additive DB CHECK/RPC contract');
