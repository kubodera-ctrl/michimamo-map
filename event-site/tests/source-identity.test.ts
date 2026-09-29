import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalSourceEndpoint,
  groupSourceEndpoints,
  sourceEndpointStats
} from '../../shared/machiibe-ingestion/source-identity';

test('source identity normalizes harmless URL differences but preserves real query identity',()=>{
  assert.equal(
    canonicalSourceEndpoint('https://Example.jp/events/?utm_source=x#top'),
    'https://example.jp/events'
  );
  assert.equal(
    canonicalSourceEndpoint('https://example.jp/events?b=2&a=1'),
    'https://example.jp/events?a=1&b=2'
  );
});

test('source endpoint stats do not inflate duplicated registry entries',()=>{
  const rows=[
    {eventUrl:'https://www.tokyo-solamachi.jp/event/list/'},
    {sourceUrl:'https://www.tokyo-solamachi.jp/event/list/'},
    {eventUrl:'https://www.tokyo-dome.co.jp/event/'},
    {eventUrl:'https://www.tokyo-dome.co.jp/event/?utm_source=registry'}
  ];
  const stats=sourceEndpointStats(rows);
  assert.deepEqual(stats,{registryRecords:4,uniqueEndpoints:2,duplicateRecords:2});
  assert.equal(groupSourceEndpoints(rows).size,2);
});
