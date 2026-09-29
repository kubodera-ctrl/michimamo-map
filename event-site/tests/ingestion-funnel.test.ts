import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyEventFunnelCounts,eventFunnelDropoff,validateEventFunnelCounts} from '../../shared/machiibe-ingestion/funnel';

test('event funnel keeps Potential through Active as separate non-increasing stages',()=>{
  const counts={potential:100,fetched:90,normalized:85,deduped:80,valid:70,publishable:60,active:55};
  assert.equal(validateEventFunnelCounts(counts),true);
  assert.deepEqual(eventFunnelDropoff(counts),{
    fetchLoss:10,normalizeLoss:5,dedupeMerged:5,invalid:10,rightsOrSourceBlocked:10,notActivated:5
  });
});

test('potential-only discovery never masquerades as fetched or active',()=>{
  assert.deepEqual(emptyEventFunnelCounts(97),{
    potential:97,fetched:0,normalized:0,deduped:0,valid:0,publishable:0,active:0
  });
  assert.equal(validateEventFunnelCounts({potential:10,fetched:11,normalized:0,deduped:0,valid:0,publishable:0,active:0}),false);
});
