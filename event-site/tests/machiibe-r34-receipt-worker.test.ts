import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../../cloudflare/machiibe-pipeline/src/index';

const source={
  id:7,name:'R34 fixture source',source_kind:'open_data',prefecture:'東京都',municipality:'港区',
  homepage_url:'https://source.example.jp',data_url:'https://source.example.jp/feed.csv',
  terms_review_status:'reviewed_allowed',acquisition_mode:'open_data',automated_fetch_allowed:true,event_use_allowed:true,
  source_language:'ja',is_active:true,robots_status:'allowed',commercial_use_status:'allowed',reuse_status:'allowed',
  redistribution_status:'allowed',cache_status:'allowed',image_use_status_source:'unknown',sns_use_status:'unknown',
  source_stage:'FETCH_ALLOWED',fetch_method:'OPEN_DATA',last_terms_checked_at:'2026-10-21T00:00:00Z',
  attribution_requirement:'official dataset',update_frequency_minutes:1440,last_checked_at:null,last_success_at:null,
  consecutive_failures:0,priority:50,source_etag:null,source_last_modified:null
};

async function exercise(options:{mode?:boolean;emptyReadback?:boolean;failInsert?:boolean;brokenFeed?:boolean}={}){
 const original=globalThis.fetch;
 const saved:any[]=[];const events:string[]=[];const calls:string[]=[];let r2count=0;let insertCount=0;
 const csv=options.brokenFeed
  ? 'event_id,イベント名,開始日,終了日,URL\n42,bad'
  : 'event_id,イベント名,開始日,終了日,URL\n42,体験イベント,2026-11-01,2026-11-01,https://source.example.jp/e/42';
 globalThis.fetch=(async (input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);calls.push(url);
  if(url.includes('/machiibe_ingest_jobs?'))return new Response('[{"id":"fixture-job"}]',{status:200});
  if(url.includes('/regional_sources?'))return new Response(JSON.stringify([source]),{status:200});
  if(url.includes('/machiibe_ingest_items?on_conflict=receipt_key')){
   insertCount++;
   if(options.failInsert)return new Response(null,{status:500});
   saved.push(...JSON.parse(String(init?.body||'[]')));
   return new Response(null,{status:201});
  }
  if(url.includes('/machiibe_ingest_items?select=')){
   return new Response(JSON.stringify(options.emptyReadback?[]:saved.map(({receipt_key,source_id,source_event_id,raw_hash,raw_object_key})=>({receipt_key,source_id,source_event_id,raw_hash,raw_object_key}))),{status:200});
  }
  if(url.includes('/machiibe_ingest_items'))throw Error('unexpected_legacy_insert');
  return new Response(csv,{status:200,headers:{'content-type':'text/csv; charset=utf-8'}});
 }) as typeof fetch;
 const message={body:{kind:'ingest-fetch',jobId:'fixture-job',sourceId:7,requestedAt:'2026-10-22T00:00:00Z'},attempts:1,ack(){events.push('ack');},retry(){events.push('retry');}};
 const env={NORMALIZATION_PREVIEW_ENABLED:options.mode?'true':'false',INGEST_RECEIPT_VERIFY_ENABLED:'true',
  SUPABASE_URL:'https://db.example.test',SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY',INTERNAL_ENQUEUE_TOKEN:'TEST_ONLY',
  MEDIA_BUCKET:{put:async()=>{r2count++;return null;}},INGEST_QUEUE:{},PRODUCTION_QUEUE:{}};
 try{await worker.queue({queue:'machiibe-ingest',messages:[message]} as never,env as never);}
 finally{globalThis.fetch=original;}
 return {saved,events,calls,r2count,insertCount};
}

test('R34 exact opt-in stores receipts and GET-verifies before ACK',async()=>{
 const result=await exercise({mode:true});
 assert.deepEqual(result.events,['ack']);
 assert.equal(result.r2count,1);
 assert.equal(result.saved.length,1);
 assert.match(result.saved[0].receipt_key,/^r34:7:[a-f0-9]{64}:0$/);
 assert.ok(result.calls.some(url=>url.includes('receipt_key=in.')));
 assert.ok(result.calls.some(url=>url.includes('on_conflict=receipt_key')));
});

test('R34 no flag combination can ACK or publish an unparsed feed',async()=>{
 const result=await exercise({mode:false});
 assert.deepEqual(result.events,['retry']);assert.equal(result.r2count,0);assert.equal(result.insertCount,0);
});

test('R34 HTTP 201 with no durable receipt cannot ACK',async()=>{
 const result=await exercise({mode:true,emptyReadback:true});
 assert.deepEqual(result.events,['retry']);assert.equal(result.r2count,1);assert.equal(result.insertCount,1);
});

test('R34 failed database insert cannot ACK after R2 write',async()=>{
 const result=await exercise({mode:true,failInsert:true});
 assert.deepEqual(result.events,['retry']);assert.equal(result.r2count,1);
});

test('R34 parse warning remains review-held even if durable receipt was confirmed',async()=>{
 const result=await exercise({mode:true,brokenFeed:true});
 assert.deepEqual(result.events,['ack']);assert.equal(result.saved[0].normalization_status,'needs_review');
});
