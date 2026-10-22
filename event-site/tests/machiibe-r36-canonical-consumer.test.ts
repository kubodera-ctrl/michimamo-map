import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVerifiedNonProdCandidates} from '../../cloudflare/machiibe-pipeline/src/r36-canonical-consumer';
import type {NormalizedEventCandidate,SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';
const source:SourcePolicySnapshot={sourceId:7,sourceName:'Fixture',sourceType:'open_data',prefecture:'東京都',municipality:'港区',baseUrl:'https://events.example.jp',feedUrl:'https://events.example.jp/feed.csv',fetchMethod:'OPEN_DATA',termsStatus:'reviewed_allowed',robotsStatus:'allowed',commercialUseStatus:'allowed',reuseStatus:'allowed',redistributionStatus:'allowed',cacheStatus:'allowed',imageUseStatus:'unknown',snsUseStatus:'unknown',attributionRequirement:'source',sourceStage:'FETCH_ALLOWED',lastTermsCheckedAt:'2026-10-20T00:00:00Z',updateFrequencyMinutes:60,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,active:true,priority:50,automatedFetchAllowed:true,etag:null,lastModified:null};
const c:NormalizedEventCandidate={sourceId:7,sourceEventId:'stable-1',sourceUrl:'https://events.example.jp/e/stable-1',sourceUpdatedAt:null,sourceHash:'b'.repeat(64),title:'Updated Title',description:null,startAt:'2026-11-02',endAt:'2026-11-02',timezone:'Asia/Tokyo',prefecture:'東京都',municipality:'港区',address:null,lat:null,lng:null,venueName:'New Venue',venueType:null,category:null,tags:[],ageMin:null,ageMax:null,family:null,childFocused:null,indoor:null,rainOk:null,accessibility:[],priceType:'free',priceMin:null,priceMax:null,imageUrl:null,imageRightsStatus:'unknown',officialUrl:'https://events.example.jp/e/stable-1',verifiedAt:null,expiresAt:null,status:'candidate'};
const row=(candidate=c,status:'ready_for_review'|'needs_review'='ready_for_review')=>({sourceEventId:candidate.sourceEventId,candidate,status,blockers:[]});
const event={id:25,source_id:7,source_event_key:'stable-1',official_url:c.officialUrl,title:'Old Title',start_date:'2026-11-01',end_date:'2026-11-01',venue_name:'Old Venue',price_type:'free',event_status:'scheduled',verification_status:'verified',publication_status:'published',schedule_type:'single'};
const provenance={id:10,event_id:25,source_url:c.officialUrl,content_hash:'a'.repeat(64)};
function fixtures(events:unknown[]= [event],records:unknown[]=[provenance]){
 const reads:string[]=[];
 return {reads,read:async(table:string,filter:string)=>{reads.push(table+'?'+filter);return table==='events'?events:records;}};
}

test('R36 only exact verified/published same-source event can be mutated with optimistic hash',async()=>{
 const {read,reads}=fixtures();const calls:unknown[]=[];
 const rpc=async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return [{updated_event_id:25,previous_hash:'a'.repeat(64),next_hash:'b'.repeat(64)}];};
 const r=await applyVerifiedNonProdCandidates([row()],source,read,rpc);
 assert.equal(r.updated,1);assert.equal(reads.length,2);assert.equal(calls.length,1);
 const data=calls[0] as {args:Record<string,unknown>};
 assert.equal((data.args.p_patch as Record<string,unknown>).title,'Updated Title');
 assert.equal(Object.hasOwn(data.args.p_patch as object,'publication_status'),false);
 assert.equal(data.args.p_status_evidence_url,null);
});

test('R36 new event is only a draft proposal, no automatic public insert',async()=>{
 const {read}=fixtures([],[]);let writes=0;
 const r=await applyVerifiedNonProdCandidates([row()],source,read,async()=>{writes++;return [];});
 assert.equal(r.newDrafts,1);assert.equal(r.updated,0);assert.equal(writes,0);
});

test('R36 status changes without official evidence are held, not inferred from feed',async()=>{
 const {read}=fixtures();let writes=0;
 const r=await applyVerifiedNonProdCandidates([row({...c,status:'cancelled'})],source,read,async()=>{writes++;return [];});
 assert.equal(r.held,1);assert.equal(writes,0);
});

test('R36 ambiguous source key, official URL drift and needs-review rows are held',async()=>{
 const {read,reads}=fixtures();let writes=0;
 const arr=[row({...c,sourceEventId:'id),status.eq.published'}),row({...c,officialUrl:'https://evil.example.jp/e/1'}),row(c,'needs_review')];
 const r=await applyVerifiedNonProdCandidates(arr,source,read,async()=>{writes++;return [];});
 assert.equal(r.held,3);assert.equal(reads.length,1);assert.equal(writes,0);
});

test('R36 data mismatch prevents publication or mutation',async()=>{
 const {read}=fixtures([{...event,publication_status:'hidden'}]);let writes=0;
 const r=await applyVerifiedNonProdCandidates([row()],source,read,async()=>{writes++;return [];});
 assert.equal(r.held,1);assert.equal(writes,0);
});

test('R36 provenance mismatch, stale or missing hash holds the event',async()=>{
 const {read}=fixtures([event],[{...provenance,content_hash:''}]);let writes=0;
 const r=await applyVerifiedNonProdCandidates([row()],source,read,async()=>{writes++;return [];});
 assert.equal(r.held,1);assert.equal(writes,0);
});

test('R36 an RPC returning zero affected rows cannot signal success',async()=>{
 const {read}=fixtures();
 await assert.rejects(applyVerifiedNonProdCandidates([row()],source,read,async()=>[]),/update_unconfirmed/);
});
