import assert from 'node:assert/strict';
import {claimDueSources,intervalMs,nextCheckAt,POLL_PROFILES,scheduleAfterFetch} from '../scripts/drive_poll_scheduler.mjs';

const H=60*60*1000;
const D=24*H;

assert.equal(POLL_PROFILES.includes('MONTHLY_BOUNDARY'),true);
assert.equal(POLL_PROFILES.includes('WEEKLY_FRIDAY'),true);

assert.equal(intervalMs('DAILY_NEXTDAY','2026-09-30T01:00:00Z'),H,'10:00 JST is daytime');
assert.equal(intervalMs('DAILY_NEXTDAY','2026-09-30T13:00:00Z'),2*H,'22:00 JST is off-hours');

assert.equal(intervalMs('WEEKLY_FRIDAY','2026-10-01T04:00:00Z'),2*H,'Thu 13:00 JST accelerates');
assert.equal(intervalMs('WEEKLY_FRIDAY','2026-10-02T03:00:00Z'),2*H,'Fri accelerates');
assert.equal(intervalMs('WEEKLY_FRIDAY','2026-10-03T04:00:00Z'),12*H,'Sat 13:00 JST returns to normal');

assert.equal(intervalMs('MONTHLY_BOUNDARY','2026-09-29T00:00:00Z'),4*H);
assert.equal(intervalMs('MONTHLY_BOUNDARY','2026-09-10T00:00:00Z'),24*H);
assert.equal(intervalMs('MONTHLY_ADVANCE','2026-09-20T00:00:00Z'),4*H);
assert.equal(intervalMs('MONTHLY_ADVANCE','2026-09-10T00:00:00Z'),24*H);

assert.equal(intervalMs('HALF_MONTH','2026-09-14T00:00:00Z'),3*H);
assert.equal(intervalMs('HALF_MONTH','2026-09-20T00:00:00Z'),24*H);
assert.equal(intervalMs('OPEN_DATA_HALF_MONTH','2026-09-30T00:00:00Z'),2*H);

assert.equal(intervalMs('HALF_YEAR','2026-06-20T00:00:00Z'),24*H);
assert.equal(intervalMs('HALF_YEAR','2026-05-20T00:00:00Z'),7*D);
assert.equal(intervalMs('ANNUAL_CHANGE_DETECT','2026-04-01T00:00:00Z'),24*H);
assert.equal(intervalMs('ANNUAL_CHANGE_DETECT','2026-09-30T00:00:00Z'),7*D);

assert.equal(intervalMs('ROLLING_10DAY','2026-09-30T00:00:00Z',{periodEnd:'2026-10-01T00:00:00Z'}),3*H);
assert.equal(intervalMs('ROLLING_10DAY','2026-09-20T00:00:00Z',{periodEnd:'2026-10-01T00:00:00Z'}),12*H);

assert.equal(intervalMs('SOURCE_STALE_AWARE','2026-09-30T00:00:00Z',{freshnessStatus:'UNKNOWN'}),6*H);
assert.equal(intervalMs('SOURCE_STALE_AWARE','2026-09-30T00:00:00Z',{freshnessStatus:'CURRENT'}),24*H);

const monthly={sourceKey:'tokyo:public-enforcement',pollProfileId:'MONTHLY_BOUNDARY'};
const next=Date.parse(nextCheckAt(monthly,'2026-09-29T00:00:00Z'));
const now=Date.parse('2026-09-29T00:00:00Z');
assert.ok(next-now>=4*H&&next-now<=4*H+15*60*1000,'jitter stays bounded');

const sources=[
  {sourceKey:'c',active:true,automatedFetchAllowed:true,termsStatus:'ALLOWED',nextCheckAt:'2026-09-30T00:00:00Z'},
  {sourceKey:'a',active:true,automatedFetchAllowed:true,termsStatus:'ALLOWED',nextCheckAt:'2026-09-29T23:00:00Z'},
  {sourceKey:'b',active:true,automatedFetchAllowed:false,termsStatus:'ALLOWED',nextCheckAt:'2026-09-29T22:00:00Z'},
  {sourceKey:'pending',active:true,automatedFetchAllowed:true,termsStatus:'PENDING',nextCheckAt:'2026-09-29T21:00:00Z'},
  {sourceKey:'future',active:true,automatedFetchAllowed:true,termsStatus:'ALLOWED',nextCheckAt:'2026-10-01T00:00:00Z'}
];
assert.deepEqual(
  claimDueSources(sources,'2026-09-30T01:00:00Z').map(x=>x.sourceKey),
  ['a','c']
);
assert.deepEqual(
  claimDueSources(sources,'2026-09-30T01:00:00Z',{allowPending:true}).map(x=>x.sourceKey),
  ['pending','a','c']
);

const ok=scheduleAfterFetch({...monthly,consecutiveFailures:3},{status:'not_modified'},'2026-09-29T00:00:00Z');
assert.equal(ok.consecutiveFailures,0);
assert.ok(Date.parse(ok.nextCheckAt)>now);

const fail1=scheduleAfterFetch({...monthly,consecutiveFailures:0},{status:'error'},'2026-09-29T00:00:00Z');
const fail3=scheduleAfterFetch({...monthly,consecutiveFailures:3},{status:'error'},'2026-09-29T00:00:00Z');
assert.equal(fail1.consecutiveFailures,1);
assert.equal(fail3.consecutiveFailures,4);
assert.ok(Date.parse(fail3.nextCheckAt)-now>Date.parse(fail1.nextCheckAt)-now,'backoff grows after repeated failures');

assert.throws(()=>intervalMs('NOPE',new Date()),/unknown_poll_profile/);
assert.throws(()=>claimDueSources([],new Date(),{limit:0}),/invalid_claim_limit/);

console.log('PASS: DRIVE per-source poll scheduler contract');
