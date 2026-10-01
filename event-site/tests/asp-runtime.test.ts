import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aspClickPath,
  validAspOfferId,
  validAspPlacementId
} from '../lib/asp-runtime';

test('ASP runtime identifiers are strict and stable',()=>{
  assert.equal(validAspOfferId('ofr_000002'),true);
  assert.equal(validAspOfferId('../bad'),false);
  assert.equal(validAspPlacementId('event_detail'),true);
  assert.equal(validAspPlacementId('event detail'),false);
});

test('ASP click path carries only offer placement and bounded screen context',()=>{
  assert.equal(
    aspClickPath('ofr_000002','event_detail','event-detail'),
    '/api/asp/click/ofr_000002?placement=event_detail&screen=event-detail'
  );
  assert.equal(aspClickPath('../bad','event_detail','event-detail'),null);
  assert.equal(aspClickPath('ofr_000002','event detail','event-detail'),null);
  assert.equal(aspClickPath('ofr_000002','event_detail',''),null);
});
