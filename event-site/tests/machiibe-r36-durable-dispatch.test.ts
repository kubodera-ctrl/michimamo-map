import assert from 'node:assert/strict';
import test from 'node:test';
import {registerAndDispatch,persistMonitorTick,safeClaim} from '../../cloudflare/machiibe-pipeline/src/r36-durable-dispatch';
const uuid=(last:string)=>`00000000-0000-4000-8000-${last.padStart(12,'0')}`;
const when='2026-10-22T10:00:00Z';
const due=[{sourceId:7,idempotencyKey:'r36:nonprod:7:60:497818',dueAt:when,frequencyMinutes:60}];
const claim={outbox_id:uuid('1'),job_id:uuid('2'),source_id:7,claim_token:uuid('3')};

test('R36 registration, leased claim, queue send then durable send-confirmation',async()=>{
 const ops:string[]=[];const sent:unknown[]=[];
 const rpc=async(name:string,payload:Record<string,unknown>)=>{
  ops.push(name);
  if(name.endsWith('register_due_r36'))return [{created:true,job_id:claim.job_id,outbox_id:claim.outbox_id}];
  if(name.endsWith('claim_dispatch_r36'))return [claim];
  if(name.endsWith('mark_dispatched_r36')){assert.equal(payload.p_token,claim.claim_token);return true;}
  throw new Error('unexpected_rpc');
 };
 const result=await registerAndDispatch(due,rpc,async message=>{sent.push(message);},when);
 assert.deepEqual(result,{registered:1,dispatched:1,claimed:1,failedDispatches:0});
 assert.deepEqual(ops,['machiibe_nonprod_register_due_r36','machiibe_nonprod_claim_dispatch_r36','machiibe_nonprod_mark_dispatched_r36']);
 assert.deepEqual(sent,[{kind:'ingest-fetch',jobId:claim.job_id,sourceId:7,requestedAt:when}]);
});

test('R36 pending retry can claim even when no source is due',async()=>{
 const rpc=async(name:string)=>name.endsWith('claim_dispatch_r36')?[claim]:true;
 const sent:unknown[]=[];
 const result=await registerAndDispatch([],rpc,async x=>{sent.push(x);},when);
 assert.equal(result.registered,0);assert.equal(result.dispatched,1);assert.equal(sent.length,1);
});

test('R36 failed Queue send releases its lease, never marks dispatched',async()=>{
 const ops:string[]=[];
 const rpc=async(name:string)=>{ops.push(name);return name.endsWith('claim_dispatch_r36')?[claim]:true;};
 await assert.rejects(registerAndDispatch([],rpc,async()=>{throw Error('mock_network_fail');},when),/mock_network_fail/);
 assert.deepEqual(ops,['machiibe_nonprod_claim_dispatch_r36','machiibe_nonprod_release_claim_r36']);
});

test('R36 send success but database receipt failure retains claim for safe expiry/retry',async()=>{
 const ops:string[]=[];
 const rpc=async(name:string)=>{ops.push(name);return name.endsWith('claim_dispatch_r36')?[claim]:false;};
 let sent=0;
 await assert.rejects(registerAndDispatch([],rpc,async()=>{sent++;},when),/dispatch_not_persisted/);
 assert.equal(sent,1);
 assert.deepEqual(ops,['machiibe_nonprod_claim_dispatch_r36','machiibe_nonprod_mark_dispatched_r36']);
});

test('R36 malformed claim envelope never reaches Cloudflare Queue',async()=>{
 const rpc=async(name:string)=>name.endsWith('claim_dispatch_r36')?[{...claim,job_id:'invalid'}]:[];
 let count=0;
 await assert.rejects(registerAndDispatch([],rpc,async()=>{count++;},when),/invalid_claim_envelope/);
 assert.equal(count,0);
 assert.throws(()=>safeClaim({...claim,source_id:-1}),/invalid_claim_envelope/);
});

test('R36 job budget is max three and rejects malformed due ids',async()=>{
 const rpc=async()=>[];let count=0;
 await assert.rejects(registerAndDispatch(Array(4).fill(due[0]),rpc,async()=>{count++;},when),/budget_rejected/);
 await assert.rejects(registerAndDispatch([{...due[0],idempotencyKey:'evil'}],rpc,async()=>{count++;},when),/budget_rejected/);
 assert.equal(count,0);
});

test('R36 monitor writes only bounded aggregates and daily-deduped alert fingerprints',async()=>{
 const records:unknown[]=[];
 const rpc=async(name:string,args:Record<string,unknown>)=>{records.push({name,args});return true;};
 const ms=Date.parse(when);
 const alerts=[{sourceId:7,code:'SOURCE_STALE' as const,severity:'warning' as const,fingerprint:'old-hourly-fingerprint'}];
 const metrics={scanned:2,eligible:1,due:1,registered:1,dispatched:1,stalled:0,failed:0,dead_letter:0};
 const result=await persistMonitorTick(rpc,ms,metrics,alerts);
 assert.equal(result.notificationsSent,0);
 assert.equal(records.length,1);
 const req=(records[0] as {args:{p_alerts:{fingerprint:string}[]}}).args;
 assert.match(req.p_alerts[0].fingerprint,/^r36:7:SOURCE_STALE:\d+$/);
 assert.equal(req.p_alerts[0].fingerprint.includes('old-hourly'),false);
});
