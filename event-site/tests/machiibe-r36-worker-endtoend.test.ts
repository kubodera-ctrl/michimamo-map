import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../cloudflare/machiibe-pipeline/src/index';
const nonProd='https://ufomasuyfgfcmwuuufzq.supabase.co';
const uuid=(last:string)=>`00000000-0000-4000-8000-${last.padStart(12,'0')}`;
const source={
 id:7,name:'R36 fixture',source_kind:'open_data',prefecture:'東京都',municipality:'港区',
 homepage_url:'https://source.example.jp',data_url:'https://source.example.jp/feed.csv',
 terms_review_status:'reviewed_allowed',acquisition_mode:'open_data',automated_fetch_allowed:true,event_use_allowed:true,
 source_language:'ja',is_active:true,robots_status:'allowed',commercial_use_status:'allowed',reuse_status:'allowed',
 redistribution_status:'allowed',cache_status:'allowed',image_use_status_source:'unknown',sns_use_status:'unknown',
 source_stage:'FETCH_ALLOWED',fetch_method:'OPEN_DATA',last_terms_checked_at:'2026-10-21T00:00:00Z',
 attribution_requirement:'official dataset',update_frequency_minutes:60,last_checked_at:null,last_success_at:null,
 consecutive_failures:0,priority:50,source_etag:null,source_last_modified:null
};
const ctrl={scheduledTime:Date.parse('2026-10-22T10:00:00Z'),cron:'0 * * * *'};
const base={SUPABASE_URL:nonProd,SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY',INTERNAL_ENQUEUE_TOKEN:'TEST_ONLY',
 AUTO_UPDATE_NONPROD_PROJECT_REF:'ufomasuyfgfcmwuuufzq',NORMALIZATION_PREVIEW_ENABLED:'true',INGEST_RECEIPT_VERIFY_ENABLED:'true'};

test('R36 full nonProd cron dispatch and durable monitor save; no publication',async()=>{
 const old=globalThis.fetch,oldInfo=console.info;
 const rpcCalls:string[]=[],sends:unknown[]=[],logs:string[]=[];
 const claim={outbox_id:uuid('1'),job_id:uuid('2'),source_id:7,claim_token:uuid('3')};
 globalThis.fetch=(async(req:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(req);
  if(url.includes('/regional_sources?')){assert.match(url,/event_use_allowed/);return new Response(JSON.stringify([source]),{status:200});}
  if(url.includes('/machiibe_ingest_jobs?'))return new Response('[]',{status:200});
  const match=url.match(/\/rpc\/(machiibe_nonprod_[a-z0-9_]+)/);
  if(match){rpcCalls.push(match[1]);
   const data=match[1].includes('register_due')?[{created:true,job_id:claim.job_id,outbox_id:claim.outbox_id}]
    :match[1].includes('claim_dispatch')?[claim]:true;
   return new Response(JSON.stringify(data),{status:200});
  }
  throw Error('unexpected_request:'+url);
 }) as typeof fetch;
 console.info=(...args)=>logs.push(args.join(' '));
 try{await worker.scheduled(ctrl,{...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_DISPATCH_ENABLED:'true',AUTO_UPDATE_MONITOR_PERSIST_ENABLED:'true',
   MEDIA_BUCKET:{put:async()=>{throw Error('unexpected_r2');}},INGEST_QUEUE:{send:async(v:unknown)=>{sends.push(v);}},PRODUCTION_QUEUE:{send:async()=>{throw Error('unexpected_prod');}}} as never);}
 finally{globalThis.fetch=old;console.info=oldInfo;}
 assert.equal(sends.length,1);assert.deepEqual(sends[0],{kind:'ingest-fetch',jobId:claim.job_id,sourceId:7,requestedAt:'2026-10-22T10:00:00.000Z'});
 assert.deepEqual(rpcCalls,['machiibe_nonprod_register_due_r36','machiibe_nonprod_claim_dispatch_r36','machiibe_nonprod_mark_dispatched_r36','machiibe_nonprod_record_tick_r36']);
 assert.match(logs[0],/"queueWrites":1/);assert.match(logs[0],/"notificationsSent":0/);
});

test('R36 revoked source cannot register a new job, and a claim RPC may return no due jobs',async()=>{
 const old=globalThis.fetch;const rpcCalls:string[]=[],sends:unknown[]=[];
 globalThis.fetch=(async(req:RequestInfo|URL)=>{
  const url=String(req);
  if(url.includes('/regional_sources?'))return new Response(JSON.stringify([{...source,event_use_allowed:false}]),{status:200});
  if(url.includes('/machiibe_ingest_jobs?'))return new Response('[]',{status:200});
  if(url.includes('/rpc/')){rpcCalls.push(url.split('/rpc/')[1]);return new Response('[]',{status:200});}
  throw Error('unexpected_request');
 }) as typeof fetch;
 const log=console.info;console.info=()=>{};
 try{await worker.scheduled(ctrl,{...base,AUTO_UPDATE_SCHEDULER_ENABLED:'true',AUTO_UPDATE_DISPATCH_ENABLED:'true',INGEST_QUEUE:{send:async(x:unknown)=>sends.push(x)}} as never);}
 finally{globalThis.fetch=old;console.info=log;}
 assert.equal(sends.length,0);
 assert.deepEqual(rpcCalls,['machiibe_nonprod_claim_dispatch_r36']);
});

async function runIngest(canonicalShouldSucceed:boolean){
 const old=globalThis.fetch,oldInfo=console.info;
 const job=uuid('2'),calls:string[]=[],rpcCalls:string[]=[],messageActions:string[]=[];
 const saved:any[]=[];let updated=0;
 const csv='event_id,イベント名,開始日,終了日,URL,会場,料金区分\n42,更新イベント,2026-11-02,2026-11-02,https://source.example.jp/e/42,New Venue,free';
 globalThis.fetch=(async(req:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(req);calls.push(url);
   if(url.includes('machiibe_ingest_jobs?id=')){
     if((init?.method||'GET')==='GET')return new Response(JSON.stringify([{id:job,source_id:7,status:'queued'}]),{status:200});
     return new Response(JSON.stringify([{id:job}]),{status:200});
   }
   if(url.includes('/regional_sources?')){assert.match(url,/event_use_allowed/);return new Response(JSON.stringify([source]),{status:200});}
   if(url.includes('machiibe_ingest_items?on_conflict=receipt_key')){saved.push(...JSON.parse(String(init?.body||'[]')));return new Response(null,{status:201});}
   if(url.includes('machiibe_ingest_items?select=receipt_key'))return new Response(JSON.stringify(saved.map(({receipt_key,source_id,source_event_id,raw_hash,raw_object_key})=>({receipt_key,source_id,source_event_id,raw_hash,raw_object_key}))),{status:200});
   if(url.includes('/events?'))return new Response(JSON.stringify([{id:25,source_id:7,source_event_key:'42',official_url:'https://source.example.jp/e/42',title:'Old Event',start_date:'2026-11-01',end_date:'2026-11-01',venue_name:'Old Venue',price_type:'free',event_status:'scheduled',verification_status:'verified',publication_status:'published',schedule_type:'single'}]),{status:200});
   if(url.includes('/event_source_records?'))return new Response(JSON.stringify([{id:90,event_id:25,source_url:'https://source.example.jp/e/42',content_hash:'a'.repeat(64)}]),{status:200});
   const match=url.match(/\/rpc\/(machiibe_nonprod_[a-z0-9_]+)/);
   if(match){rpcCalls.push(match[1]);
     if(match[1].includes('link_job_receipts'))return new Response(JSON.stringify(saved.length),{status:200});
     if(match[1].includes('apply_existing_event')){
       updated++;
       const body=JSON.parse(String(init?.body||'{}'));
       assert.equal(body.p_event_id,25);assert.equal(body.p_status_evidence_url,null);
       return new Response(JSON.stringify(canonicalShouldSucceed?[{updated_event_id:25,previous_hash:'a'.repeat(64),next_hash:saved[0].raw_hash}]:[]),{status:200});
     }
     if(match[1].includes('finish_dispatch'))return new Response('true',{status:200});
     throw Error('unrecognized_rpc');
   }
   if(url==='https://source.example.jp/feed.csv')return new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}});
   throw Error('unexpected_request:'+url);
 }) as typeof fetch;
 console.info=()=>{};
 const env={...base,AUTO_UPDATE_DISPATCH_ENABLED:'true',CANONICAL_UPDATE_ENABLED:'true',MEDIA_BUCKET:{put:async()=>null},INGEST_QUEUE:{},PRODUCTION_QUEUE:{}};
 const msg={body:{kind:'ingest-fetch',jobId:job,sourceId:7,requestedAt:'2026-10-22T10:00:00Z'},attempts:1,
 ack:()=>messageActions.push('ack'),retry:()=>messageActions.push('retry')};
 try{await worker.queue({queue:'machiibe-ingest',messages:[msg]} as never,env as never);}
 finally{globalThis.fetch=old;console.info=oldInfo;}
 return {calls,rpcCalls,actions:messageActions,saved,updated};
}

test('R36 real Worker entry mock: normalized receipt→per-job durable link→canonical RPC→finish→ACK',async()=>{
 const result=await runIngest(true);
 assert.deepEqual(result.actions,['ack']);assert.equal(result.updated,1);
 assert.deepEqual(result.rpcCalls,['machiibe_nonprod_link_job_receipts_r36','machiibe_nonprod_apply_existing_event_r36','machiibe_nonprod_finish_dispatch_r36']);
 assert.ok(result.saved.every(x=>x.normalization_status==='pending'));
 assert.equal(result.calls.some(x=>x.includes('/rest/v1/events?')),true);
});

test('R36 canonical RPC response not confirmed means retry; never claim success',async()=>{
 const result=await runIngest(false);
 assert.deepEqual(result.actions,['retry']);assert.equal(result.updated,1);
 assert.equal(result.rpcCalls.includes('machiibe_nonprod_finish_dispatch_r36'),false);
});

test('R36 nonProd opt-in with production DB URL never performs any REST mutation or network fetch',async()=>{
 const old=globalThis.fetch;let requests=0;const actions:string[]=[];
 globalThis.fetch=(async()=>{requests++;throw Error('PRODUCTION_NETWORK_FORBIDDEN');}) as typeof fetch;
 const env={...base,SUPABASE_URL:'https://ckftozjhdszlwqnylmxv.supabase.co',AUTO_UPDATE_DISPATCH_ENABLED:'true',CANONICAL_UPDATE_ENABLED:'true'};
 const msg={body:{kind:'ingest-fetch',jobId:uuid('2'),sourceId:7,requestedAt:'2026-10-22T10:00:00Z'},attempts:1,
  ack:()=>actions.push('ack'),retry:()=>actions.push('retry')};
 try{await worker.queue({queue:'machiibe-ingest',messages:[msg]} as never,env as never);}finally{globalThis.fetch=old;}
 assert.equal(requests,0);assert.deepEqual(actions,['retry']);
});


test('R36 completed job duplicate delivery ACKs without fetch, R2 or canonical update',async()=>{
 const old=globalThis.fetch,log=console.info,job=uuid('2'),requests:string[]=[],actions:string[]=[];
 globalThis.fetch=(async (req:RequestInfo|URL,init?:RequestInit)=>{
   const url=String(req);requests.push(url);
   if(url.includes('/machiibe_ingest_jobs?id=')){
     assert.equal(init?.method||'GET','GET');
     return new Response(JSON.stringify([{id:job,source_id:7,status:'completed'}]),{status:200});
   }
   if(url.includes('/rpc/machiibe_nonprod_finish_dispatch_r36'))return new Response('true',{status:200});
   throw Error('DUPLICATE_REPLAY_SIDE_EFFECT:'+url);
 }) as typeof fetch;
 console.info=()=>{};
 const env={...base,AUTO_UPDATE_DISPATCH_ENABLED:'true',CANONICAL_UPDATE_ENABLED:'true'};
 const msg={body:{kind:'ingest-fetch',jobId:job,sourceId:7,requestedAt:'2026-10-22T10:00:00Z'},attempts:2,
 ack:()=>actions.push('ack'),retry:()=>actions.push('retry')};
 try{await worker.queue({queue:'machiibe-ingest',messages:[msg]} as never,env as never);}
 finally{globalThis.fetch=old;console.info=log;}
 assert.deepEqual(actions,['ack']);assert.equal(requests.length,2);
});

test('R36 wrong source/job link cannot ACK or fetch a source',async()=>{
 const old=globalThis.fetch,log=console.info,job=uuid('2'),requests:string[]=[],actions:string[]=[];
 globalThis.fetch=(async (req:RequestInfo|URL)=>{
   const url=String(req);requests.push(url);
   if(url.includes('/machiibe_ingest_jobs?id='))return new Response(JSON.stringify([{id:job,source_id:999,status:'queued'}]),{status:200});
   throw Error('MISROUTED_REPLAY_SIDE_EFFECT:'+url);
 }) as typeof fetch;
 console.info=()=>{};
 const env={...base,AUTO_UPDATE_DISPATCH_ENABLED:'true',CANONICAL_UPDATE_ENABLED:'true'};
 const msg={body:{kind:'ingest-fetch',jobId:job,sourceId:7,requestedAt:'2026-10-22T10:00:00Z'},attempts:2,
 ack:()=>actions.push('ack'),retry:()=>actions.push('retry')};
 try{await worker.queue({queue:'machiibe-ingest',messages:[msg]} as never,env as never);}
 finally{globalThis.fetch=old;console.info=log;}
 assert.deepEqual(actions,['retry']);assert.equal(requests.length,1);
});

test('R36 terminal failed job is not replayed if dead_letter already persisted',async()=>{
 const old=globalThis.fetch,log=console.info,job=uuid('2'),requests:string[]=[],actions:string[]=[];
 globalThis.fetch=(async (req:RequestInfo|URL)=>{
   const url=String(req);requests.push(url);
   if(url.includes('/machiibe_ingest_jobs?id='))return new Response(JSON.stringify([{id:job,source_id:7,status:'failed'}]),{status:200});
   if(url.includes('/machiibe_nonprod_dispatch_outbox?'))return new Response(JSON.stringify([{status:'dead_letter'}]),{status:200});
   throw Error('DEAD_LETTER_REPLAY_SIDE_EFFECT:'+url);
 }) as typeof fetch;
 console.info=()=>{};
 const env={...base,AUTO_UPDATE_DISPATCH_ENABLED:'true',CANONICAL_UPDATE_ENABLED:'true'};
 const msg={body:{kind:'ingest-fetch',jobId:job,sourceId:7,requestedAt:'2026-10-22T10:00:00Z'},attempts:2,
 ack:()=>actions.push('ack'),retry:()=>actions.push('retry')};
 try{await worker.queue({queue:'machiibe-ingest',messages:[msg]} as never,env as never);}
 finally{globalThis.fetch=old;console.info=log;}
 assert.deepEqual(actions,['ack']);assert.equal(requests.length,2);
});
