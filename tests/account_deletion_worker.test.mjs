import test from 'node:test';
import assert from 'node:assert/strict';
import { runDeletion } from '../supabase/functions/account-deletion/worker.mjs';
const job = { jobId: 'job', userId: 'user', status: 'cleaning' };
function mock({ batches = [[]], failStorage = false, failAuth = false, missingAuth = false } = {}) {
  const calls = [];
  const service = {
    rpc: async (name) => { calls.push(name); return { data: name === 'account_deletion_photo_batch' ? (batches.shift() || []) : null, error: null }; },
    storage: { from: (bucket) => ({ remove: async (names) => { calls.push(['remove', bucket, names]); return { error: failStorage ? {} : null }; } }) },
    auth: { admin: {
      updateUserById: async () => { calls.push('ban'); return { error: missingAuth ? { code: 'user_not_found' } : null }; },
      deleteUser: async () => { calls.push('deleteAuth'); return { error: missingAuth ? { code: 'user_not_found' } : failAuth ? {} : null }; }
    } }
  };
  return { service, calls };
}
test('removes Storage before DB and Auth, then marks completed', async () => {
  const { service, calls } = mock({ batches: [[{ bucket_id: 'spot-images', name: 'user/a.jpg' }, { bucket_id: 'aed-submission-images', name: 'user/b.jpg' }], []] });
  assert.deepEqual(await runDeletion(service, job), { status: 'completed' });
  assert.deepEqual(calls, ['ban','account_deletion_photo_batch',['remove','spot-images',['user/a.jpg']],['remove','aed-submission-images',['user/b.jpg']], 'account_deletion_photo_batch','account_deletion_clean_data','deleteAuth','account_deletion_complete']);
});
test('failed photo removal stops before DB/Auth deletion', async () => {
  const { service, calls } = mock({ batches: [[{ bucket_id: 'spot-images', name: 'user/a.jpg' }]], failStorage: true });
  await assert.rejects(runDeletion(service, job), /photo_removal_failed/);
  assert(!calls.includes('account_deletion_clean_data'));
  assert(!calls.includes('deleteAuth'));
});
test('failed Auth removal does not claim completion', async () => {
  const { service, calls } = mock({ failAuth: true });
  await assert.rejects(runDeletion(service, job), /auth_removal_failed/);
  assert(!calls.includes('account_deletion_complete'));
});
test('can finalize after Auth was already removed', async () => {
  const { service, calls } = mock({ missingAuth: true });
  assert.equal((await runDeletion(service, { ...job, status: 'db_cleaned' })).status, 'completed');
  assert(calls.includes('account_deletion_complete'));
});
test('limits work per request and leaves remainder resumable', async () => {
  const batch = [{ bucket_id: 'spot-images', name: 'user/a.jpg' }];
  const { service, calls } = mock({ batches: [batch, batch] });
  assert.equal((await runDeletion(service, job, 1)).status, 'processing');
  assert(!calls.includes('account_deletion_clean_data'));
});
test('completed jobs make no calls', async () => {
  const { service, calls } = mock();
  assert.equal((await runDeletion(service, { status: 'completed' })).status, 'completed');
  assert.deepEqual(calls, []);
});
