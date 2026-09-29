import test from 'node:test';
import assert from 'node:assert/strict';
import {inferReservationSnapshot} from '../../shared/machiibe-ingestion/reservation';

test('reservation state recognizes lottery, first-come and closure separately',()=>{
  assert.deepEqual(inferReservationSnapshot('事前抽選の申込受付中'),{mode:'lottery',state:'open'});
  assert.deepEqual(inferReservationSnapshot('先着受付・定員に達したため受付終了'),{mode:'first_come',state:'closed'});
  assert.deepEqual(inferReservationSnapshot('事前予約不要・自由参加'),{mode:'not_required',state:'unknown'});
});