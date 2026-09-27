import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {
  createDisabledMachiibeMediaStorageAdapter,
  createMemoryMachiibeMediaStorageAdapter,
  sha256Bytes
} from '../lib/machiibe-media-storage';

test('media storage defaults fail closed before any write',async()=>{
  const adapter=createDisabledMachiibeMediaStorageAdapter();
  assert.equal(adapter.canWrite,false);
  assert.equal(adapter.kind,'disabled');
  await assert.rejects(
    ()=>adapter.putPrivateObject({
      key:'production/machiibe/a/b/p01.png',
      body:new Uint8Array([1,2,3]),
      contentType:'image/png',
      sha256:sha256Bytes(new Uint8Array([1,2,3])),
      bytes:3
    }),
    /not configured/
  );
});

test('memory adapter rehashes bytes and supports rollback deletion',async()=>{
  const {adapter,objects}=createMemoryMachiibeMediaStorageAdapter();
  const body=new Uint8Array([1,2,3,4,5]);
  const digest=sha256Bytes(body);
  const receipt=await adapter.putPrivateObject({
    key:'production/machiibe/post/rev/p01.png',
    body,
    contentType:'image/png',
    sha256:digest,
    bytes:body.byteLength
  });
  assert.equal(receipt.private,true);
  assert.equal(receipt.sha256,digest);
  assert.equal(objects.size,1);
  await adapter.deletePrivateObject(receipt.key);
  assert.equal(objects.size,0);
  await assert.rejects(
    ()=>adapter.putPrivateObject({
      key:'production/machiibe/post/rev/p01.png',
      body,
      contentType:'image/png',
      sha256:'0'.repeat(64),
      bytes:body.byteLength
    }),
    /sha256 mismatch/
  );
});

test('media upload route requires admin/same-origin, server rehash and atomic DB RPC',()=>{
  const source=fs.readFileSync(new URL('../app/api/admin/production/media/upload/route.ts',import.meta.url),'utf8');
  assert.match(source,/isSameOriginRequest/);
  assert.match(source,/validateAdminSession/);
  assert.match(source,/hashMachiibeMediaManifest/);
  assert.match(source,/sha256Bytes/);
  assert.match(source,/media_file_hash_mismatch/);
  assert.match(source,/getMachiibeMediaStorageAdapter/);
  assert.match(source,/admin_commit_machiibe_media/);
  assert.match(source,/approval_status==='approved'/);
  assert.match(source,/publish_eligible/);
  assert.match(source,/cleanup\(adapter,receipts\)/);
});

test('media commit SQL is service-role only and resets approval gates',()=>{
  const sql=fs.readFileSync(new URL('../../supabase/migrations/20260928082000_machiibe_media_commit.sql',import.meta.url),'utf8');
  assert.match(sql,/security definer/i);
  assert.match(sql,/grant execute .*service_role/is);
  assert.match(sql,/revoke all .*anon,authenticated/is);
  assert.match(sql,/media_committed/);
  assert.match(sql,/visual_qc='pending'/);
  assert.match(sql,/golden_qc='pending'/);
  assert.match(sql,/publish_eligible=false/);
  assert.match(sql,/status='generated'/);
});
