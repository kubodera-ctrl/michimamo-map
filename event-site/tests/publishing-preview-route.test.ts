import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../app/api/admin/production/publish-preview/route.ts',import.meta.url),'utf8');

test('publishing preview route is admin-only, same-origin and never sends an external post',()=>{
  assert.match(source,/isSameOriginRequest/);
  assert.match(source,/validateAdminSession/);
  assert.match(source,/previewOnly:true/);
  assert.match(source,/externalRequestSent:false/);
  assert.match(source,/planPublishingReadiness/);
  assert.match(source,/credentialsConfigured:false/);
  assert.match(source,/publicMediaReady:false/);
  assert.match(source,/verifiedMediaDomain:false/);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/\.insert\(/);
  assert.doesNotMatch(source,/\.update\(/);
});
