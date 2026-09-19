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
