import test from 'node:test';
import assert from 'node:assert/strict';
import {inferReservationSnapshot} from '../../shared/machiibe-ingestion/reservation';

test('reservation state recognizes lottery, first-come and closure separately',()=>{
  assert.deepEqual(inferReservationSnapshot('事前抽選の申込受付中'),{mode:'lottery',state:'open'});
  assert.deepEqual(inferReservationSnapshot('先着受付・定員に達したため受付終了'),{mode:'first_come',state:'closed'});
  assert.deepEqual(inferReservationSnapshot('事前予約不要・自由参加'),{mode:'not_required',state:'unknown'});
  assert.deepEqual(inferReservationSnapshot('開催中止・予約受付中止'),{mode:'unknown',state:'cancelled'});
});

test('reservation display fails closed when state evidence is stale or only a URL exists',async()=>{
  const {reservationStateForDisplay}=await import('../../shared/machiibe-ingestion/reservation');
  const recent={
    mode:'required' as const,state:'open' as const,opensAt:null,closesAt:null,
    checkedAt:'2026-09-30T08:00:00Z',sourceUrl:'https://official.test/event',
    reservationUrl:'https://official.test/reserve',stateUpdatedAt:'2026-09-30T08:00:00Z'
  };
  assert.equal(reservationStateForDisplay(recent,'2026-09-30T09:00:00Z'), 'open');
  assert.equal(reservationStateForDisplay({...recent,checkedAt:'2026-09-28T08:00:00Z'},'2026-09-30T09:00:00Z'),'unknown');
  assert.equal(reservationStateForDisplay({...recent,state:'unknown',checkedAt:null,stateUpdatedAt:null},'2026-09-30T09:00:00Z'),'unknown');
});
