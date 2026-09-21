import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { safeJsonLd } from '../lib/seo';
import { isSameOriginRequest } from '../lib/request-security';

test('JSON-LD serializer cannot close its script tag',()=>{
  const serialized=safeJsonLd({name:'bad </script><script>alert(1)</script>'});
  assert.doesNotMatch(serialized,/<\/script/i);
  assert.match(serialized,/\\u003c\/script\\u003e/);
});

test('admin mutation origin guard rejects cross-origin and same-site subdomains',()=>{
  const same=new Request('https://events.example.jp/api/admin/pickups/toggle',{
    method:'POST',
    headers:{origin:'https://events.example.jp','sec-fetch-site':'same-origin'}
  });
  const cross=new Request('https://events.example.jp/api/admin/pickups/toggle',{
    method:'POST',
    headers:{origin:'https://evil.example','sec-fetch-site':'cross-site'}
  });
  const sibling=new Request('https://events.example.jp/api/admin/pickups/toggle',{
    method:'POST',
    headers:{origin:'https://other.example.jp','sec-fetch-site':'same-site'}
  });
  assert.equal(isSameOriginRequest(same),true);
  assert.equal(isSameOriginRequest(cross),false);
  assert.equal(isSameOriginRequest(sibling),false);
});

test('raw search terms are not forwarded to Google Analytics',()=>{
  const source=fs.readFileSync(new URL('../components/MetricPing.tsx',import.meta.url),'utf8');
  assert.match(source,/sanitizeSearchTerm\(searchTerm\)/);
  assert.doesNotMatch(source,/search_term\s*:/);
});

test('correction analytics metric is registered end to end',()=>{
  const api=fs.readFileSync(new URL('../app/api/analytics/track/route.ts',import.meta.url),'utf8');
  const sql=fs.readFileSync(new URL('../../supabase/migrations/20260919043000_event_platform_admin_analytics.sql',import.meta.url),'utf8');
  assert.match(api,/correction_open/);
  assert.match(sql,/correction_open/);
});


test('admin routes are private-cache and wildcard image proxy is disabled',()=>{
  const config=fs.readFileSync(new URL('../next.config.mjs',import.meta.url),'utf8');
  assert.match(config,/Cache-Control/);
  assert.match(config,/private, no-store, max-age=0/);
  assert.doesNotMatch(config,/hostname:\s*['"]\*\*['"]/);
});

test('operator X compose rejects cross-site requests',()=>{
  const source=fs.readFileSync(new URL('../app/api/admin/x/route.ts',import.meta.url),'utf8');
  assert.match(source,/isSameOriginRequest\(request\)/);
  assert.match(source,/status:403/);
});

test('sponsor image only accepts HTTPS configuration',()=>{
  const source=fs.readFileSync(new URL('../components/HomePrSlot.tsx',import.meta.url),'utf8');
  assert.match(source,/\^https:\\\/\\\//i);
});
