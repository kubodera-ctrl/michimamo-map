import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../../cloudflare/machiibe-pipeline/src/index';

function eligibleSource(overrides:Record<string,unknown>={}){
  return {
    id:7,name:'fixture source',source_kind:'open_data',prefecture:'三重県',municipality:'津市',homepage_url:'https://events.example.jp',
    data_url:'https://events.example.jp/feed.csv',terms_review_status:'reviewed_allowed',
    acquisition_mode:'open_data',automated_fetch_allowed:true,event_use_allowed:true,source_language:'ja',is_active:true,
    robots_status:'not_applicable',commercial_use_status:'allowed',reuse_status:'allowed',
    redistribution_status:'allowed',cache_status:'allowed',image_use_status_source:'unknown',sns_use_status:'unknown',source_stage:'FETCH_ALLOWED',
    fetch_method:'OPEN_DATA',last_terms_checked_at:'2026-10-20T00:00:00.000Z',
    attribution_requirement:'Fixture attribution',update_frequency_minutes:1440,last_checked_at:null,last_success_at:null,
    consecutive_failures:0,priority:50,source_etag:null,source_last_modified:null,...overrides
  };
}

async function runQueue(source:Record<string,unknown>,sourceResponse=new Response('unexpected source fetch',{status:200}),normalizationPreview=false,failJobPatchAt=0,emptyPatchAt=0){
  const originalFetch=globalThis.fetch;
  const calls:{method:string;url:string}[]=[];
  const redirects:string[]=[];
  let objectWrites=0;
  const events:number[]=[];
  const inserts:unknown[]=[];
  let externalFetches=0;
  let jobPatchCount=0;
  globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=String(input),method=init?.method||'GET';
    calls.push({method,url});
    if(!url.includes('/machiibe_ingest_jobs?')&&!url.includes('/regional_sources?'))redirects.push(init?.redirect||'follow');
    if(url.includes('/machiibe_ingest_jobs?')){
      jobPatchCount++;
      if(jobPatchCount===failJobPatchAt) return new Response(null,{status:503});
      if(jobPatchCount===emptyPatchAt) return new Response('[]',{status:200,headers:{'content-type':'application/json'}});
      return new Response(JSON.stringify([{id:'fixture-job'}]),{status:200,headers:{'content-type':'application/json'}});
    }
    if(url.includes('/regional_sources?')){
      return new Response(JSON.stringify([source]),{status:200,headers:{'content-type':'application/json'}});
    }
    if(url.includes('/machiibe_ingest_items')&&method==='POST'){
      inserts.push(JSON.parse(String(init?.body||'null')));
      return new Response(null,{status:201});
    }
    externalFetches++;
    return sourceResponse;
  }) as typeof fetch;

  const message={
    body:{kind:'ingest-fetch',jobId:'fixture-job',sourceId:7,requestedAt:'2026-10-21T00:00:00.000Z'},
    attempts:1,
    ack(){events.push(1);},
    retry(){events.push(2);}
  };
  const env={
    SUPABASE_URL:'https://supabase.example.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',
    INTERNAL_ENQUEUE_TOKEN:'fixture-only',MEDIA_BUCKET:{put:async()=>{objectWrites++;return null;}},
    INGEST_QUEUE:{},PRODUCTION_QUEUE:{},NORMALIZATION_PREVIEW_ENABLED:normalizationPreview?'true':'false'
  };
  try{
    await worker.queue({queue:'machiibe-ingest',messages:[message]} as never,env as never);
  }finally{globalThis.fetch=originalFetch;}
  return {calls,events,externalFetches,redirects,objectWrites,inserts,jobPatchCount};
}

test('worker handler rejects a source missing the real terms-review timestamp before external fetch',async()=>{
  const result=await runQueue(eligibleSource({last_terms_checked_at:null}));
  assert.equal(result.externalFetches,0);
  assert.deepEqual(result.events,[1]);
  assert.ok(result.calls.some(call=>call.url.includes('/regional_sources?')));
  assert.equal(result.calls.filter(call=>call.method==='PATCH').length,2);
});

test('worker handler rejects an unsafe URL before external fetch',async()=>{
  const result=await runQueue(eligibleSource({data_url:'http://127.0.0.1/private'}));
  assert.equal(result.externalFetches,0);
  assert.deepEqual(result.events,[1]);
  assert.equal(result.calls.filter(call=>call.method==='PATCH').length,2);
});

test('worker handler blocks redirects and does not fetch their destination',async()=>{
  const result=await runQueue(eligibleSource(),new Response(null,{status:302,headers:{location:'https://attacker.example/redirect-target'}}));
  assert.equal(result.externalFetches,1);
  assert.deepEqual(result.redirects,['manual']);
  assert.equal(result.objectWrites,0);
  assert.deepEqual(result.events,[2]);
  assert.equal(result.calls.filter(call=>call.url.includes('attacker.example')).length,0);
});

test('normalization preview remains OFF by default and preserves the raw-envelope path',async()=>{
  const csv='event_id,イベント名,開始日,終了日,URL\n42,親子体験,2026-11-01,2026-11-01,https://events.example.jp/e/42';
  const result=await runQueue(eligibleSource(),new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}}));
  assert.deepEqual(result.events,[1]);
  assert.equal(result.objectWrites,1);
  assert.equal(result.inserts.length,1);
  assert.equal(Array.isArray(result.inserts[0]),false);
  assert.equal((result.inserts[0] as Record<string,unknown>).source_event_id,null);
});

test('opt-in normalization preview uses shared parser and records stable per-event IDs as pending items only',async()=>{
  const csv='event_id,イベント名,開始日,終了日,URL\n42,親子体験,2026-11-01,2026-11-01,https://events.example.jp/e/42';
  const result=await runQueue(eligibleSource(),new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}}),true);
  assert.deepEqual(result.events,[1]);
  assert.equal(result.externalFetches,1);
  assert.equal(result.objectWrites,1);
  assert.equal(result.inserts.length,1);
  const [item]=result.inserts[0] as Array<Record<string,unknown>>;
  assert.equal(item?.source_event_id,'42');
  assert.equal(item?.source_url,'https://events.example.jp/e/42');
  assert.equal(item?.normalization_status,'pending');
  assert.equal(item?.canonical_event_id,undefined);
});

test('opt-in normalization preview records missing stable IDs as needs_review, never as published events',async()=>{
  const csv='イベント名,開始日,終了日\n親子体験,2026-11-01,2026-11-01';
  const result=await runQueue(eligibleSource(),new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}}),true);
  assert.deepEqual(result.events,[1]);
  const [item]=(result.inserts[0] as Array<Record<string,unknown>>);
  assert.equal(item?.source_event_id,null);
  assert.equal(item?.normalization_status,'needs_review');
  assert.equal(item?.error_code,'NORMALIZATION_REVIEW_REQUIRED');
  assert.equal(result.calls.some(call=>call.url.includes('/events?')),false);
});

test('opt-in normalization preview rejects unsupported charset before writing R2 or database rows',async()=>{
  const result=await runQueue(eligibleSource(),new Response('fixture',{status:200,headers:{'content-type':'text/csv; charset=shift_jis'}}),true);
  assert.deepEqual(result.events,[1]);
  assert.equal(result.objectWrites,0);
  assert.equal(result.inserts.length,0);
  assert.equal(result.jobPatchCount,2);
});


test('duplicate IDs are never marked pending in the opt-in queue integration',async()=>{
  const csv='event_id,イベント名,開始日,終了日,URL\n42,親子体験A,2026-11-01,2026-11-01,https://events.example.jp/e/42\n42,親子体験B,2026-11-02,2026-11-02,https://events.example.jp/e/42';
  const result=await runQueue(eligibleSource(),new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}}),true);
  assert.deepEqual(result.events,[1]);
  assert.equal(result.objectWrites,1);
  const rows=result.inserts[0] as Array<Record<string,unknown>>;
  assert.equal(rows.length,2);
  assert.ok(rows.every(row=>row.normalization_status==='needs_review'));
  assert.ok(rows.every(row=>String(row.error_message).includes('duplicate_source_event_id_in_batch')));
});

test('malformed CSV is held for review rather than exposing apparently ready rows',async()=>{
  const csv='event_id,イベント名,開始日,終了日,URL\n41,親子体験,2026-11-01,2026-11-01,https://events.example.jp/e/41\n42,broken';
  const result=await runQueue(eligibleSource(),new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}}),true);
  assert.deepEqual(result.events,[1]);
  const rows=result.inserts[0] as Array<Record<string,unknown>>;
  assert.ok(rows.every(row=>row.normalization_status==='needs_review'));
});

test('permanent preview error retries when the failure record cannot be persisted',async()=>{
  const result=await runQueue(eligibleSource(),new Response('fixture',{status:200,headers:{'content-type':'text/csv; charset=shift_jis'}}),true,2);
  assert.deepEqual(result.events,[2]);
  assert.equal(result.objectWrites,0);
  assert.equal(result.inserts.length,0);
  assert.equal(result.jobPatchCount,2);
});

test('blank or missing enqueue token cannot authorize POST, even with blank Bearer',async()=>{
  for(const configured of ['',undefined]){
    let sends=0;
    const env={INTERNAL_ENQUEUE_TOKEN:configured,INGEST_QUEUE:{send:async()=>{sends++;}}};
    const request=new Request('https://worker.example/enqueue/ingest',{
      method:'POST',headers:{authorization:'Bearer '},
      body:JSON.stringify({jobId:'forbidden-job',sourceId:7})
    });
    const response=await worker.fetch(request,env as never);
    assert.equal(response.status,403);
    assert.equal(sends,0);
  }
});


test('zero-row database PATCH must not ACK a queued fetch',async()=>{
  const result=await runQueue(eligibleSource(),new Response('irrelevant',{status:200}),false,0,1);
  assert.deepEqual(result.events,[2]);
  assert.equal(result.externalFetches,0);
  assert.equal(result.objectWrites,0);
  assert.equal(result.inserts.length,0);
  assert.equal(result.jobPatchCount,2);
});

test('a zero-row failure-status PATCH cannot ACK a permanent format error',async()=>{
  const response=new Response('fixture',{status:200,headers:{'content-type':'text/csv; charset=shift_jis'}});
  const result=await runQueue(eligibleSource(),response,true,0,2);
  assert.deepEqual(result.events,[2]);
  assert.equal(result.objectWrites,0);
  assert.equal(result.inserts.length,0);
  assert.equal(result.jobPatchCount,2);
});

test('R36 sources with event_use_allowed=false are rejected before any external feed fetch',async()=>{
  const result=await runQueue(eligibleSource({event_use_allowed:false}));
  assert.equal(result.externalFetches,0);
  assert.deepEqual(result.events,[1]);
});
