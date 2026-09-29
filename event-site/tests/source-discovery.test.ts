import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {discoverEventPageCandidatesFromHtml,discoverSourceHintsFromHtml} from '../../shared/machiibe-ingestion/discovery';

test('source discovery finds JSON-LD Event and alternate feeds without fetching',()=>{
  const html=`
    <html><head>
      <link rel="alternate" type="application/rss+xml" href="/events.rss">
      <link rel="alternate" type="text/calendar" href="/calendar.ics">
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Event","name":"Sample","startDate":"2026-10-01"}
      </script>
    </head><body>
      <a href="/open/events.csv">CSV</a>
      <a href="/open/events.xlsx">XLSX</a>
    </body></html>`;
  const hints=discoverSourceHintsFromHtml(html,'https://example.jp/events/');
  assert.ok(hints.some((hint)=>hint.kind==='JSON_LD_EVENT'));
  assert.ok(hints.some((hint)=>hint.kind==='RSS'&&hint.url==='https://example.jp/events.rss'));
  assert.ok(hints.some((hint)=>hint.kind==='ICS'&&hint.url==='https://example.jp/calendar.ics'));
  assert.ok(hints.some((hint)=>hint.kind==='CSV'));
  assert.ok(hints.some((hint)=>hint.kind==='XLSX'));
});

test('source discovery deduplicates repeated feed links and ignores invalid JSON-LD',()=>{
  const html=`
    <link rel="alternate" type="application/rss+xml" href="/events.rss">
    <link rel="alternate" type="application/rss+xml" href="/events.rss">
    <script type="application/ld+json">{broken}</script>`;
  const hints=discoverSourceHintsFromHtml(html,'https://example.jp/');
  assert.equal(hints.filter((hint)=>hint.kind==='RSS').length,1);
  assert.equal(hints.some((hint)=>hint.kind==='JSON_LD_EVENT'),false);
});


test('expanded discovery inventory keeps fetch fail-closed and explicit review states',()=>{
  const registry=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/national_source_discovery_v1.json',import.meta.url),'utf8'));
  const allowed=new Set(['DISCOVERED','PREFLIGHT','TERMS_REVIEWED','ROBOTS_REVIEWED','READY','ACTIVE','BLOCKED']);
  assert.ok(registry.sources.length>=26);
  assert.ok(registry.sources.every((row:any)=>allowed.has(row.review_state)));
  assert.ok(registry.sources
    .filter((row:any)=>!['READY','ACTIVE'].includes(row.review_state))
    .every((row:any)=>row.automated_fetch_allowed===false));
  assert.equal(registry.counts.ready,1);
  assert.equal(registry.counts.active,0);
  const mie=registry.sources.find((row:any)=>row.source_key==='mie-pref-events-open-data');
  assert.equal(mie?.review_state,'READY');
  assert.equal(mie?.automated_fetch_allowed,true);
  assert.ok(registry.sources.some((row:any)=>row.source_key==='bodik-odcs-national-catalog'));
  assert.ok(registry.sources.some((row:any)=>row.source_key==='mitsui-shopping-park-lalaport-network'));
  assert.ok(registry.sources.some((row:any)=>row.source_key==='ario-event-network'));
  assert.ok(registry.sources.some((row:any)=>row.source_key==='shizuoka-pref-events-open-data'));
  assert.ok(registry.sources.some((row:any)=>row.source_key==='miyagi-pref-events-dataeye'));
  assert.ok(registry.sources.some((row:any)=>row.source_key==='bodik-otsu-events'));
  assert.ok(registry.counts.concrete_prefecture_coverage_from_all_inventories>=23);
});


test('facility discovery finds event pages without treating discovery as approval',()=>{
  const html=`
    <a href="/shop/">Shop</a>
    <a href="/event/">EVENT・POPUP</a>
    <a href="/event/calendar/">イベントカレンダー</a>
    <a href="https://members.example.jp/login">Login</a>
    <a href="https://other.example.net/event/">external event</a>
  `;
  const rows=discoverEventPageCandidatesFromHtml(html,'https://mall.example.jp/',[
    'example.jp'
  ]);
  assert.ok(rows.some((row)=>row.url==='https://mall.example.jp/event/'&&row.confidence==='high'));
  assert.ok(rows.some((row)=>row.url==='https://mall.example.jp/event/calendar/'));
  assert.equal(rows.some((row)=>row.url.includes('login')),false);
  assert.equal(rows.some((row)=>row.url.includes('other.example.net')),false);
});
