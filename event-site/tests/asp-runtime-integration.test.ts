import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('Machiibe consumes shared ASP runtime and keeps local offers fail-closed',()=>{
  const runtime=read('../lib/asp-runtime.ts');
  assert.match(runtime,/get_asp_offers_for_placement/);
  assert.match(runtime,/p_service_key:'machiibe'/);
  assert.match(runtime,/record_asp_offer_click/);
  assert.match(runtime,/tracking_url/);
  assert.doesNotMatch(runtime,/machiibe_promotions/);
});

test('TOP and event detail use approved placement ids without hardcoded campaigns',()=>{
  const home=read('../components/HomePrSlot.tsx');
  const detail=read('../app/events/[slug]/page.tsx');
  const slot=read('../components/AspPlacement.tsx');
  assert.match(home,/getMachiibeAspOffersForPlacement\('pr'\)/);
  assert.match(detail,/placementId="event_detail"/);
  assert.match(slot,/offer\.offer_name/);
  assert.match(slot,/aspClickPath/);
});

test('click route resolves tracking URL from runtime before redirecting',()=>{
  const route=read('../app/api/asp/click/[offerId]/route.ts');
  assert.match(route,/getMachiibeAspOffersForPlacement/);
  assert.match(route,/recordMachiibeAspClick/);
  assert.match(route,/NextResponse\.redirect\(offer\.tracking_url,303\)/);
  assert.doesNotMatch(route,/searchParams\.get\('to'\)/);
});
