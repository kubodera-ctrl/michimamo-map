import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, parseExcludeTerms, resolveDateRange } from '../lib/events';

test('30日以内 is exactly 30 calendar dates including today',()=>{
  const range=resolveDateRange('30days');
  assert.equal(range.endDate,addDays(range.startDate,29));
});

test('exclude terms accept Japanese and ASCII commas without duplicates',()=>{
  assert.deepEqual(
    parseExcludeTerms('ビュッフェ、ディナー, ビュッフェ'),
    ['ビュッフェ','ディナー']
  );
});


test('custom date mode supports a single selected day',()=>{
  const range=resolveDateRange('custom','2026-10-05','');
  assert.deepEqual(
    {startDate:range.startDate,endDate:range.endDate},
    {startDate:'2026-10-05',endDate:'2026-10-05'}
  );
  assert.match(range.label,/2026年10月5日/);
});

test('custom date mode supports a selected range and normalizes reversed dates',()=>{
  const normal=resolveDateRange('custom','2026-10-05','2026-10-08');
  assert.equal(normal.startDate,'2026-10-05');
  assert.equal(normal.endDate,'2026-10-08');

  const reversed=resolveDateRange('custom','2026-10-08','2026-10-05');
  assert.equal(reversed.startDate,'2026-10-05');
  assert.equal(reversed.endDate,'2026-10-08');
});

test('custom date range is bounded to 400 calendar dates',()=>{
  const range=resolveDateRange('custom','2026-01-01','2028-01-01');
  assert.equal(range.endDate,addDays('2026-01-01',399));
});
