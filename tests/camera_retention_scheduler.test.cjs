const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260920040431_camera_retention_scheduler_health_dev32.sql'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/camera-evidence-retention/index.ts'),'utf8');
const ui=fs.readFileSync(path.join(root,'camera-evidence.js'),'utf8');

test('camera retention has an hourly production scheduler with one-time token auth',()=>{
  assert.match(migration,/camera-evidence-retention-hourly/);
  assert.match(migration,/37 \* \* \* \*/);
  assert.match(migration,/camera_retention_authorize/);
  assert.match(migration,/interval '2 minutes'/);
  assert.match(edge,/x-retention-token/);
  assert.match(edge,/camera_retention_authorize/);
});

test('scheduled auth does not replace the signed-in manual retry path',()=>{
  assert.match(edge,/authorization\.startsWith\('Bearer '\)/);
  assert.match(edge,/caller\.auth\.getUser/);
});

test('admin UI surfaces retention health without changing evidence actions',()=>{
  assert.match(ui,/自動削除 正常/);
  assert.match(ui,/pendingDelete/);
  assert.match(ui,/failedDelete/);
  assert.match(ui,/storageBytes/);
  assert.match(ui,/data-action='preserve'|dataset\.action=item\.state==='decision_due'\?'extend':'preserve'/);
});
