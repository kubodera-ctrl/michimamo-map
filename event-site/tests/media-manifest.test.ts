import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMachiibeMediaManifest,
  canonicalMachiibeMediaManifest,
  machiibeR2ObjectKey
} from '../lib/machiibe-media-manifest';

const files=[
  {pageNumber:1,pageCount:5,fileName:'machiibe_13_2026-09-28_2026-10-04_p01-of-05.png',sha256:'a'.repeat(64),bytes:1234},
  {pageNumber:2,pageCount:5,fileName:'machiibe_13_2026-09-28_2026-10-04_p02-of-05.png',sha256:'b'.repeat(64),bytes:2234},
  {pageNumber:3,pageCount:5,fileName:'machiibe_13_2026-09-28_2026-10-04_p03-of-05.png',sha256:'c'.repeat(64),bytes:3234},
  {pageNumber:4,pageCount:5,fileName:'machiibe_13_2026-09-28_2026-10-04_p04-of-05.png',sha256:'d'.repeat(64),bytes:4234},
  {pageNumber:5,pageCount:5,fileName:'machiibe_13_2026-09-28_2026-10-04_p05-of-05.png',sha256:'e'.repeat(64),bytes:5234}
];

test('media manifest keeps deterministic R2 keys and page order',()=>{
  const manifest=buildMachiibeMediaManifest('postset-1','revision-1',[...files].reverse());
  assert.equal(manifest.items.length,5);
  assert.equal(manifest.items[0].pageNumber,1);
  assert.equal(
    manifest.items[0].r2Key,
    'production/machiibe/postset-1/revision-1/machiibe_13_2026-09-28_2026-10-04_p01-of-05.png'
  );
  assert.equal(JSON.parse(canonicalMachiibeMediaManifest(manifest)).items[4].pageNumber,5);
});

test('media manifest rejects missing, duplicate or malformed page metadata',()=>{
  assert.throws(()=>buildMachiibeMediaManifest('postset-1','revision-1',files.slice(0,4)),/page count is invalid/);
  assert.throws(()=>buildMachiibeMediaManifest('postset-1','revision-1',[files[0],files[1],files[2],files[3],{...files[4],pageNumber:4}]),/contiguous/);
  assert.throws(()=>buildMachiibeMediaManifest('postset-1','revision-1',[...files.slice(0,4),{...files[4],sha256:'bad'}]),/metadata is invalid/);
});

test('R2 object key rejects unsafe identifiers and filenames',()=>{
  assert.throws(()=>machiibeR2ObjectKey('../bad','revision-1',files[0].fileName),/postSetId is invalid/);
  assert.throws(()=>machiibeR2ObjectKey('postset-1','revision-1','../bad.png'),/fileName is invalid/);
});
