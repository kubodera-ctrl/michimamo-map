import test from 'node:test';
import assert from 'node:assert/strict';
import {explicitEventStateBlockers,mapExplicitEventState} from '../../shared/machiibe-ingestion/event-state';

test('event lifecycle state is mapped only from explicit source status values',()=>{
  const mapping={CANCEL:'cancelled',POSTPONE:'postponed',SOLD_OUT:'sold_out'} as const;
  const known=mapExplicitEventState('CANCEL',mapping,'https://official.test/e/1','2026-09-30T09:00:00Z','2026-09-30T08:00:00Z');
  assert.equal(known.state,'cancelled');
  assert.equal(known.explicit,true);
  assert.deepEqual(explicitEventStateBlockers(known),[]);

  const prose=mapExplicitEventState('たぶん中止かもしれない',mapping,'https://official.test/e/1','2026-09-30T09:00:00Z',null);
  assert.equal(prose.state,'unknown');
  assert.equal(prose.explicit,false);
  assert.ok(explicitEventStateBlockers(prose).includes('explicit_status_missing'));
});
