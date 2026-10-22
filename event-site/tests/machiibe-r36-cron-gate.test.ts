import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../cloudflare/machiibe-pipeline/src/index';

const now=Date.parse('2026-10-22T10:00:00Z');
const base={SUPABASE_URL:'https://ufomasuyfgfcmwuuufzq.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY',
  INTERNAL_ENQUEUE_TOKEN:'TEST_ONLY',MEDIA_BUCKET:{put:async()=>{throw Error('unexpectedR2');}},
  INGEST_QUEUE:{send:async()=>{throw Error('unexpectedQueue');}},PRODUCTION_QUEUE:{send:async()=>{throw Error('unexpectedQueue');}}};
const ctrl={scheduledTime:now,cron:'0 * * * *'};

test('R36 default scheduled handler is inert, even without configured secrets',async()=>{
 const old=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;throw Error('unexpected network');}) as typeof fetch;
 try{await worker.scheduled(ctrl,{} as never);}finally{globalThis.fetch=old;}
 assert.equal(calls,0);
});

test('R36 source, parsing, receipts and nonProd reference must ALL be explicitly gated',async()=>{
 const old=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;throw Error('unexpected network');}) as typeof fetch;
 const cases=[
  {...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true'},
  {...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_NONPROD_PROJECT_REF:'ufomasuyfgfcmwuuufzq'},
  {...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_NONPROD_PROJECT_REF:'ufomasuyfgfcmwuuufzq',NORMALIZATION_PREVIEW_ENABLED:'true'},
  {...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_NONPROD_PROJECT_REF:'ufomasuyfgfcmwuuufzq',NORMALIZATION_PREVIEW_ENABLED:'true',INGEST_RECEIPT_VERIFY_ENABLED:'true',SUPABASE_URL:'https://ckftozjhdszlwqnylmxv.supabase.co'}
 ];
 try{for(const env of cases){await assert.rejects(worker.scheduled(ctrl,env as never),/gate_closed/);}}
 finally{globalThis.fetch=old;}
 assert.equal(calls,0);
});

test('R36 fully opted-in nonProd handler READS ONLY and reports aggregates',async()=>{
 const old=globalThis.fetch,info=console.info;
 const calls:{url:string;method:string}[]=[];const logs:string[]=[];
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);calls.push({url,method:init?.method||'GET'});
  if(url.includes('regional_sources'))return new Response(JSON.stringify([{id:7,name:'unapproved',source_kind:'open_data',source_stage:'CANDIDATE',automated_fetch_allowed:false}]),{status:200});
  if(url.includes('machiibe_ingest_jobs'))return new Response(JSON.stringify([{id:'stalled',status:'queued',updated_at:'2026-10-22T08:00:00Z',started_at:null,requested_at:'2026-10-22T08:00:00Z'}]),{status:200});
  throw Error('unexpected fetch');
 }) as typeof fetch;
 console.info=(...args)=>{logs.push(args.join(' '));};
 try{await worker.scheduled(ctrl,{...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_NONPROD_PROJECT_REF:'ufomasuyfgfcmwuuufzq',NORMALIZATION_PREVIEW_ENABLED:'true',INGEST_RECEIPT_VERIFY_ENABLED:'true'} as never);}
 finally{globalThis.fetch=old;console.info=info;}
 assert.equal(calls.length,2);assert.ok(calls.every(x=>x.method==='GET'));
 assert.equal(logs.length,1);assert.match(logs[0],/machiibe_r36_nonprod_schedule_preview/);
 assert.match(logs[0],/"held":1/);assert.match(logs[0],/"stalledJobs":1/);
 assert.match(logs[0],/"queueWrites":0/);assert.match(logs[0],/"notificationsSent":0/);
 assert.equal(logs[0].includes('SUPABASE_SERVICE_ROLE_KEY'),false);
});

test('R36 malformed nonProd source list fails closed with no queue/DB writes',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=(async()=>new Response('{"invalid":true}',{status:200})) as typeof fetch;
 try{await assert.rejects(worker.scheduled(ctrl,{...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_NONPROD_PROJECT_REF:'ufomasuyfgfcmwuuufzq',NORMALIZATION_PREVIEW_ENABLED:'true',INGEST_RECEIPT_VERIFY_ENABLED:'true'} as never),/invalid_schedule_input/);}
 finally{globalThis.fetch=old;}
});
