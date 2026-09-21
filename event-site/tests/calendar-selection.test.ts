import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  activeOccurrencesForDate,
  findOccurrenceByKey,
  findOccurrenceForRequest,
  occurrenceKey,
  uniqueOccurrenceDates
} from '../lib/calendar-selection';

const occurrences=[
  {date:'2026-09-23',start_time:'11:00:00',end_time:null,status:'scheduled'},
  {date:'2026-09-23',start_time:'13:30:00',end_time:null,status:'scheduled'},
  {date:'2026-09-24',start_time:'11:00:00',end_time:null,status:'cancelled'},
  {date:'2026-09-25',start_time:'11:00:00',end_time:null,status:'sold_out'},
  {date:'2026-09-26',start_time:'11:00:00',end_time:null,status:'registration_closed'}
];

test('same-day sessions get distinct occurrence keys',()=>{
  assert.notEqual(occurrenceKey(occurrences[0]),occurrenceKey(occurrences[1]));
  assert.equal(findOccurrenceByKey(occurrences,occurrenceKey(occurrences[1]))?.start_time,'13:30:00');
});

test('calendar request can select an exact same-day session',()=>{
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-23','13:30:00')?.start_time,'13:30:00');
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-23',null)?.start_time,'11:00:00');
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-24','11:00:00'),undefined);
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-25','11:00:00'),undefined);
  assert.equal(findOccurrenceForRequest(occurrences,'2026-09-26','11:00:00'),undefined);
});

test('outing plan keeps unique active dates only',()=>{
  assert.deepEqual(uniqueOccurrenceDates(occurrences),['2026-09-23']);
});


test('planned date exposes both active sessions',()=>{
  const sessions=activeOccurrencesForDate(occurrences,'2026-09-23');
  assert.equal(sessions.length,2);
  assert.deepEqual(sessions.map((item)=>item.start_time),['11:00:00','13:30:00']);
});


test('ICS UID includes selected occurrence date and time',()=>{
  const source=fs.readFileSync(new URL('../app/api/calendar/[slug]/route.ts',import.meta.url),'utf8');
  assert.match(source,/const uidTime=\(startTime\|\|'all-day'\)/);
  assert.match(source,/const uid=\`\$\{event\.slug\}-\$\{startDate\}-\$\{uidTime\}@machi-ibe\`/);
  assert.doesNotMatch(source,/UID:\$\{escapeIcs\(event\.slug\)\}@machi-ibe/);
});
