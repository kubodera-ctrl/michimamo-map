import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIngestReceipts, verifyIngestReceipts,receiptReadbackPath,receiptBatchMax} from '../../cloudflare/machiibe-pipeline/src/ingest-receipts';
const hash='a'.repeat(64);
const make=(id:string|null,index=0)=>({job_id:'job-a',source_id:7,source_event_id:id,source_url:`https://example.test/${index}`,raw_hash:hash,raw_object_key:'ingest/7/'+hash+'.bin',normalization_status:'pending'});
function persisted(rows:ReturnType<typeof buildIngestReceipts>){return rows.map(row=>({receipt_key:row.receipt_key,source_id:row.source_id,source_event_id:row.source_event_id,raw_hash:row.raw_hash,raw_object_key:row.raw_object_key}));}

test('R34 one valid row carries stable content-addressed receipt, no event mutation',()=>{
 const rows=buildIngestReceipts([make('e-1')]);
 assert.equal(rows.length,1);assert.equal(rows[0].normalization_status,'pending');
 assert.equal(rows[0].receipt_key,`r34:7:${hash}:0`);
 assert.equal(verifyIngestReceipts(rows,persisted(rows)),true);
 assert.ok(receiptReadbackPath(rows).includes('select=receipt_key'));
});

test('R34 repeated IDs are reduced to a single *held* receipt, raw payload remains in R2',()=>{
 const rows=buildIngestReceipts([make('x',0),make('x',1),make('z',2)]);
 assert.equal(rows.length,2);
 assert.equal(rows[0].normalization_status,'needs_review');
 assert.match(rows[0].error_message||'',/duplicate_source_event_id_in_batch:2/);
 assert.equal(rows[1].normalization_status,'pending');
});

test('R34 unidentified rows receive distinct transport keys while event ID stays null',()=>{
 const a=buildIngestReceipts([make(null,0),make(null,1)]);
 const b=buildIngestReceipts([make(null,0),make(null,1)]);
 assert.equal(a[0].source_event_id,null); assert.equal(a[1].source_event_id,null);
 assert.equal(a[0].normalization_status,'needs_review');
 assert.notEqual(a[0].receipt_key,a[1].receipt_key);assert.deepEqual(a,b);
});

test('R34 readback fails closed on missing, altered, duplicate or unverifiable receipts',()=>{
 const rows=buildIngestReceipts([make('x'),make('y')]);const ok=persisted(rows);
 assert.equal(verifyIngestReceipts(rows,ok),true);
 assert.equal(verifyIngestReceipts(rows,ok.slice(0,1)),false);
 assert.equal(verifyIngestReceipts(rows,[ok[0],ok[0]]),false);
 assert.equal(verifyIngestReceipts(rows,[ok[0],{...ok[1],raw_hash:'0'.repeat(64)}]),false);
 assert.equal(verifyIngestReceipts(rows,[ok[0],{...ok[1],source_event_id:'spoof'}]),false);
 assert.equal(verifyIngestReceipts(rows,[ok[0],{...ok[1],raw_object_key:null}]),false);
});

test('R34 mixed source/hash, invalid hash and 201+ rows cannot be acknowledged',()=>{
 assert.throws(()=>buildIngestReceipts([make('x'),{...make('z'),source_id:8}]),/mixed_origin/);
 assert.throws(()=>buildIngestReceipts([{...make('x'),raw_hash:'bad'}]),/contract_invalid/);
 assert.throws(()=>buildIngestReceipts(Array.from({length:receiptBatchMax+1},(_,i)=>make(String(i),i))),/limit/);
});
