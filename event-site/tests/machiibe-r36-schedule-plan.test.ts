import test from 'node:test';
import assert from 'node:assert/strict';
import {
 previewSourceSchedule,previewJobHealth,type ScheduleSourceRow
} from '../../cloudflare/machiibe-pipeline/src/source-schedule-plan';

const now=Date.parse('2026-10-22T10:00:00Z');
const row:ScheduleSourceRow={
 id:7,name:'Fixture',source_kind:'open_data',prefecture:'東京都',municipality:'港区',
 homepage_url:'https://source.example.jp',data_url:'https://source.example.jp/feed.csv',
 fetch_method:'OPEN_DATA',terms_review_status:'reviewed_allowed',robots_status:'allowed',
 commercial_use_status:'allowed',reuse_status:'allowed',redistribution_status:'allowed',cache_status:'allowed',
 image_use_status_source:'unknown',sns_use_status:'unknown',attribution_requirement:'official dataset',
 source_stage:'FETCH_ALLOWED',last_terms_checked_at:'2026-10-21T00:00:00Z',
 update_frequency_minutes:60,last_checked_at:null,last_success_at:null,
 consecutive_failures:0,is_active:true,priority:50,automated_fetch_allowed:true,event_use_allowed:true,
 source_etag:null,source_last_modified:null,acquisition_mode:'open_data'
};
const plan=(v:unknown,when=now,maxDue=3)=>previewSourceSchedule(v,when,maxDue);

test('R36 approved source is due once in a stable scheduled interval; no side effects',()=>{
 const r=plan([row]);
 assert.deepEqual(r.due.map(x=>x.sourceId),[7]);
 assert.equal(r.dueTotal,1);
 assert.equal(r.enabled,false);
 assert.equal(r.queueWrites,0);assert.equal(r.databaseWrites,0);assert.equal(r.notificationsSent,0);
 assert.match(r.due[0].idempotencyKey,/^r36:nonprod:7:60:\d+$/);
 const sameSlot=plan([row],now+60_000);
 assert.equal(sameSlot.due[0].idempotencyKey,r.due[0].idempotencyKey);
});

test('R36 current CANDIDATE/automatedFetchAllowed=false is held before due list',()=>{
 const r=plan([{...row,source_stage:'CANDIDATE',automated_fetch_allowed:false}]);
 assert.equal(r.eligible,0);assert.equal(r.held,1);assert.equal(r.dueTotal,0);
 assert.equal(r.alerts[0]?.code,'SOURCE_POLICY_HOLD');
});

test('R36 missing terms review or manual source never triggers a fetch',()=>{
 const r=plan([{...row,last_terms_checked_at:null},{...row,id:8,fetch_method:'MANUAL'}]);
 assert.equal(r.due.length,0);assert.equal(r.held,2);
});

test('R36 frequency and last-check control due and backoff',()=>{
 const early=plan([{...row,last_checked_at:'2026-10-22T09:15:00Z'}]);
 assert.equal(early.dueTotal,0);
 const due=plan([{...row,last_checked_at:'2026-10-22T08:00:00Z'}]);
 assert.equal(due.dueTotal,1);
 const delayed=plan([{...row,last_checked_at:'2026-10-22T08:00:00Z',consecutive_failures:2}]);
 assert.equal(delayed.dueTotal,0);
});

test('R36 future or bad last-checked timestamp never becomes due',()=>{
 const r=plan([{...row,last_checked_at:'2026-10-22T11:00:00Z'},{...row,id:8,last_checked_at:'not-time'}]);
 assert.equal(r.dueTotal,0);
 assert.deepEqual(r.alerts.map(x=>x.code),['SOURCE_LAST_CHECK_INVALID','SOURCE_LAST_CHECK_INVALID']);
});

test('R36 failures and stale source yield alerts without sending any notification',()=>{
 const p=plan([{...row,last_success_at:'2026-10-22T07:00:00Z',consecutive_failures:3}]);
 assert.ok(p.alerts.some(x=>x.code==='SOURCE_FAILURE_STREAK'));
 assert.ok(p.alerts.some(x=>x.code==='SOURCE_STALE'));
 assert.equal(p.notificationsSent,0);
});

test('R36 source budget is hard-capped and sorted by reviewed priority',()=>{
 const p=plan([row,{...row,id:10,priority:40},{...row,id:2,priority:5},{...row,id:9,priority:30}],now,2);
 assert.deepEqual(p.due.map(x=>x.sourceId),[2,9]);
 assert.equal(p.dueTotal,4);assert.equal(p.truncated,true);
 assert.throws(()=>plan([row],now,4),/budget_out_of_bounds/);
});

test('R36 duplicate source id is held and cannot schedule twice',()=>{
 const p=plan([row,{...row,name:'repeated'}]);
 assert.equal(p.dueTotal,1);assert.equal(p.held,1);
});

test('R36 invalid source and invalid time fail closed with no publishing',()=>{
 assert.throws(()=>plan('invalid'),/invalid_schedule_input/);
 assert.throws(()=>plan([row],NaN),/invalid_schedule_input/);
 assert.equal(plan([null]).dueTotal,0);
});

test('R36 monitoring finds queued/fetching stalls and failures',()=>{
 const a=[
  {id:'a',status:'queued',requested_at:'2026-10-22T08:00:00Z',started_at:null,updated_at:'2026-10-22T08:00:00Z',attempt_count:0},
  {id:'b',status:'fetching',requested_at:'2026-10-22T09:00:00Z',started_at:'2026-10-22T09:30:00Z',updated_at:'2026-10-22T09:30:00Z',attempt_count:2},
  {id:'c',status:'failed',requested_at:null,started_at:null,updated_at:null,attempt_count:2},
  {id:'d',status:'dead_letter',requested_at:null,started_at:null,updated_at:null,attempt_count:3},
  {id:'e',status:'completed',requested_at:null,started_at:null,updated_at:null,attempt_count:1}
 ];
 const p=previewJobHealth(a,now);
 assert.deepEqual({stalled:p.stalled,failed:p.failed,deadLetter:p.deadLetter,notificationsSent:p.notificationsSent},
  {stalled:2,failed:1,deadLetter:1,notificationsSent:0});
});

test('R36 malformed or future job timestamps are not trusted',()=>{
 const a=[{id:'a',status:'queued',updated_at:'not-a-date'},
  {id:'b',status:'queued',updated_at:'2026-10-23T00:00:00Z'},
  {id:'c',status:'queued'}, {id:'d',status:'wat'}];
 const p=previewJobHealth(a,now);
 assert.equal(p.invalid,4);assert.equal(p.stalled,0);
 assert.throws(()=>previewJobHealth([],Infinity),/invalid_jobs_input/);
});
