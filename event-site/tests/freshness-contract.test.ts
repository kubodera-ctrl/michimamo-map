import test from 'node:test';
import assert from 'node:assert/strict';
import {freshnessContractBlockers,freshnessContractPasses} from '../../shared/machiibe-ingestion/freshness';

test('freshness contract does not accept catalog/resource timestamps as event freshness',()=>{
  const metadataOnly={
    sourceUpdatedAt:'2026-09-30T00:00:00Z',
    resourceUpdatedAt:'2026-09-30T00:00:00Z',
    eventUpdatedAt:null,
    firstSeenAt:null,
    lastSeenAt:null,
    lastCheckedAt:'2026-09-30T09:00:00Z',
    nextCheckAt:'2026-10-01T09:00:00Z',
    contentFreshness:'fresh' as const
  };
  assert.equal(freshnessContractPasses(metadataOnly),false);
  assert.ok(freshnessContractBlockers(metadataOnly).includes('event_freshness_evidence'));
});

test('freshness contract accepts explicit event freshness evidence with a valid check window',()=>{
  const snapshot={
    sourceUpdatedAt:'2026-09-30T00:00:00Z',
    resourceUpdatedAt:'2026-09-30T00:00:00Z',
    eventUpdatedAt:'2026-09-29T12:00:00Z',
    firstSeenAt:'2026-09-28T00:00:00Z',
    lastSeenAt:'2026-09-30T09:00:00Z',
    lastCheckedAt:'2026-09-30T09:00:00Z',
    nextCheckAt:'2026-10-01T09:00:00Z',
    contentFreshness:'fresh' as const
  };
  assert.equal(freshnessContractPasses(snapshot),true);
});
