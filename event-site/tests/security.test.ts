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


test('GA measurement ID is validated before scripts and send targets',()=>{
  const config=fs.readFileSync(new URL('../lib/analytics-config.ts',import.meta.url),'utf8');
  const layout=fs.readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
  const metric=fs.readFileSync(new URL('../components/MetricPing.tsx',import.meta.url),'utf8');
  assert.match(config,/\^G-\[A-Z0-9\]/);
  assert.match(layout,/normalizeGaMeasurementId/);
  assert.match(metric,/normalizeGaMeasurementId/);
  assert.match(metric,/page_location:sanitizedPageUrl/);
  assert.match(metric,/page_referrer:/);
});

test('saved search URLs are constrained to local paths',()=>{
  const source=fs.readFileSync(new URL('../lib/client-prefs.ts',import.meta.url),'utf8');
  assert.match(source,/normalizeSavedSearchUrl/);
  assert.match(source,/raw\.startsWith\('\/'\)/);
  assert.match(source,/raw\.startsWith\('\/\/'\)/);
});

test('admin config requires strong minimum secrets',()=>{
  const source=fs.readFileSync(new URL('../lib/admin-auth.ts',import.meta.url),'utf8');
  assert.match(source,/password\.length>=16/);
  assert.match(source,/sessionSecret\.length>=32/);
});

test('search-term retention is bounded in analytics migration',()=>{
  const sql=fs.readFileSync(new URL('../../supabase/migrations/20260919043000_event_platform_admin_analytics.sql',import.meta.url),'utf8');
  assert.match(sql,/event_search_terms_daily/);
  assert.match(sql,/metric_date < .*\)-90/);
});


test('admin event editor enforces publish gate and bounded fields',()=>{
  const route=fs.readFileSync(new URL('../app/api/admin/events/update/route.ts',import.meta.url),'utf8');
  const page=fs.readFileSync(new URL('../app/admin/events/[slug]/page.tsx',import.meta.url),'utf8');
  const dashboard=fs.readFileSync(new URL('../app/admin/page.tsx',import.meta.url),'utf8');

  assert.match(route,/isSameOriginRequest\(request\)/);
  assert.match(route,/validateAdminSession/);
  assert.match(route,/publicationStatus==='published'/);
  assert.match(route,/verificationStatus!=='verified'/);
  assert.match(route,/!source\.event_use_allowed/);
  assert.match(route,/!source\.is_active/);
  assert.match(route,/endDate<startDate/);
  assert.match(route,/httpUrl\(officialUrl\)/);
  assert.match(page,/イベント確認・公開設定/);
  assert.match(page,/name="verification_status"/);
  assert.match(page,/name="publication_status"/);
  assert.match(page,/name="event_status"/);
  assert.match(dashboard,/\/admin\/events\//);
});
