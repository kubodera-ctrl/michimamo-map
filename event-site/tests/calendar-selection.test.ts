import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findOccurrenceByKey,
  findOccurrenceForRequest,
  occurrenceKey,
  uniqueOccurrenceDates
} from '../lib/calendar-selection';

const occurrences=[
  {date:'2026-09-23',start_time:'11:00:00',end_time:null,status:'scheduled'},
  {date:'2026-09-23',start_time:'13:30:00',end_time:null,status:'scheduled'},
  {date:'2026-09-24',start_time:'11:00:00',end_time:null,status:'cancelled'}
];

test('same-day sessions get distinct occurrence keys',()=>{
  assert.notEqual(occurrenceKey(occurrences[0]),occurrenceKey(occurrences[1]));
  assert.equal(findOccurrenceByKey(occurrences,occurrenceKey(occurrences[1]))?.start_time,'13:30:00');
});

test('calendar request can select an exact same-day session',()=>{
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-23','13:30:00')?.start_time,'13:30:00');
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-23',null)?.start_time,'11:00:00');
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-24','11:00:00'),undefined);
});

test('outing plan keeps unique active dates only',()=>{
  assert.deepEqual(uniqueOccurrenceDates(occurrences),['2026-09-23']);
});
