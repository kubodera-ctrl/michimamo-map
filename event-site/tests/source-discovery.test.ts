import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverSourceHintsFromHtml} from '../../shared/machiibe-ingestion/discovery';

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
