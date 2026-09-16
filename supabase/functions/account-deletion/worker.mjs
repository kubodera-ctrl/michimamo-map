// All identifiers come from the authenticated admin RPC, never directly from the request.
export async function runDeletion(service, job, maxBatches = 5) {
  if (job.status === 'completed') return { status: 'completed' };
  if (!job.jobId || !job.userId) throw new Error('invalid_job');
  const rpc = async (name) => {
    const { data, error } = await service.rpc(name, { p_job_id: job.jobId });
    if (error) throw new Error(name);
    return data;
  };
  // A retry after Auth deletion must still finalize the receipt.
  const { error: banError } = await service.auth.admin.updateUserById(job.userId, { ban_duration: '876000h' });
  if (banError && banError.code !== 'user_not_found') throw new Error('auth_suspend_failed');
  for (let batch = 0; batch <= maxBatches; batch++) {
    const photos = await rpc('account_deletion_photo_batch');
    if (!Array.isArray(photos)) throw new Error('invalid_photo_batch');
    if (!photos.length) break;
    if (batch === maxBatches) return { status: 'processing' };
    const groups = new Map();
    for (const photo of photos) {
      if (!groups.has(photo.bucket_id)) groups.set(photo.bucket_id, []);
      groups.get(photo.bucket_id).push(photo.name);
    }
    for (const [bucket, names] of groups) {
      const { error } = await service.storage.from(bucket).remove(names);
      if (error) throw new Error('photo_removal_failed');
    }
  }
  await rpc('account_deletion_clean_data');
  const { error } = await service.auth.admin.deleteUser(job.userId);
  if (error && error.code !== 'user_not_found') throw new Error('auth_removal_failed');
  await rpc('account_deletion_complete');
  return { status: 'completed' };
}
