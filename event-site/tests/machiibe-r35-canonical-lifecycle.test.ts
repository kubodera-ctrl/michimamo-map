import assert from 'node:assert/strict';
import test from 'node:test';
import {planCanonicalLifecycle,lifecycleMutationParameters,type ExistingCanonicalEvent} from '../../cloudflare/machiibe-pipeline/src/canonical-lifecycle';
import type {SourcePolicySnapshot,NormalizedEventCandidate} from '../../shared/machiibe-ingestion/contracts';
const source:SourcePolicySnapshot={sourceId:7,sourceName:'Fixture',sourceType:'open_data',prefecture:'東京都',municipality:'港区',baseUrl:'https://events.example.jp',feedUrl:'https://events.example.jp/feed.csv',fetchMethod:'OPEN_DATA',termsStatus:'reviewed_allowed',robotsStatus:'allowed',commercialUseStatus:'allowed',reuseStatus:'allowed',redistributionStatus:'allowed',cacheStatus:'allowed',imageUseStatus:'unknown',snsUseStatus:'unknown',attributionRequirement:'Fixture',sourceStage:'FETCH_ALLOWED',lastTermsCheckedAt:'2026-10-20T00:00:00Z',updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,active:true,priority:50,automatedFetchAllowed:true,etag:null,lastModified:null};
const candidate:NormalizedEventCandidate={sourceId:7,sourceEventId:'stable-1',sourceUrl:'https://events.example.jp/e/1',sourceUpdatedAt:null,sourceHash:'b'.repeat(64),title:'Family event',description:null,startAt:'2026-11-01',endAt:'2026-11-01',timezone:'Asia/Tokyo',prefecture:'東京都',municipality:'港区',address:null,lat:null,lng:null,venueName:'Venue A',venueType:null,category:null,tags:[],ageMin:null,ageMax:null,family:null,childFocused:null,indoor:null,rainOk:null,accessibility:[],priceType:'free',priceMin:null,priceMax:null,imageUrl:null,imageRightsStatus:'unknown',officialUrl:'https://events.example.jp/e/1',verifiedAt:null,expiresAt:null,status:'candidate'};
const existing:ExistingCanonicalEvent={id:25,sourceId:7,sourceEventId:'stable-1',officialUrl:'https://events.example.jp/e/1',contentHash:'a'.repeat(64),title:'Family event',startDate:'2026-11-01',endDate:'2026-11-01',venueName:'Venue A',priceType:'free',eventStatus:'scheduled',verificationStatus:'verified',publicationStatus:'published',scheduleType:'single'};
function plan(opts:Record<string,unknown>={}){return planCanonicalLifecycle({source,candidate,existing,sourceReadinessVerified:true,eventUrlVerified:true,completeFeed:false,asOfMs:Date.parse('2026-10-22T00:00:00Z'),...opts});}

test('R35 identical fields with new raw feed SHA do not publish or mutate an event',()=>{
 const p=plan();assert.equal(p.action,'unchanged');assert.equal(p.publishNewEvent,false);assert.equal(p.patch,null);
});

test('R35 exact same-source verified date and venue updates produce a bounded patch',()=>{
 const p=plan({candidate:{...candidate,startAt:'2026-11-02',endAt:'2026-11-02',venueName:'Venue B'}});
 assert.equal(p.action,'update_existing');assert.deepEqual(p.changeKinds,['date_changed','venue_changed']);
 assert.deepEqual(p.patch,{start_date:'2026-11-02',end_date:'2026-11-02',venue_name:'Venue B'});
 const rpc=lifecycleMutationParameters(p,existing,source);
 assert.equal(rpc.p_expected_hash,'a'.repeat(64));assert.equal(rpc.p_event_id,25);
 assert.equal(Object.hasOwn(rpc.p_patch,'publication_status'),false);
});

test('R35 explicit authoritative cancellation updates status; no missing-feed inference',()=>{
 const evidence={value:'cancelled' as const,sourceEventId:'stable-1',eventSpecificUrl:'https://events.example.jp/e/1',observedAt:'2026-10-21T00:00:00Z'};
 const yes=plan({statusEvidence:evidence});assert.equal(yes.action,'update_existing');assert.equal(yes.patch?.event_status,'cancelled');
 const no=plan({candidate:{...candidate,status:'cancelled'}});
 assert.equal(no.action,'hold');assert.ok(no.blockers.includes('explicit_event_status_evidence_required'));
});

test('R35 a new event is always a held draft proposal, never auto-published',()=>{
 const p=plan({existing:null});assert.equal(p.action,'new_draft');assert.equal(p.patch,null);assert.equal(p.publishNewEvent,false);
 assert.throws(()=>lifecycleMutationParameters(p,existing,source),/not_approved/);
});

test('R35 source not approved or stale official URL blocks updates',()=>{
 const blocked=plan({source:{...source,automatedFetchAllowed:false}});
 assert.equal(blocked.action,'hold');assert.ok(blocked.blockers.includes('source_not_approved_for_automation'));
 const drift=plan({candidate:{...candidate,officialUrl:'https://events.example.jp/e/2'}});
 assert.equal(drift.action,'hold');assert.ok(drift.blockers.includes('official_event_url_changed_requires_review'));
});

test('R35 invalid dates, media rights and missing venue cannot wipe verified facts',()=>{
 const bad=plan({candidate:{...candidate,startAt:'2026-11-32',imageUrl:'https://site.example.jp/copy.jpg',venueName:null}});
 assert.equal(bad.action,'hold');
 assert.ok(bad.blockers.includes('event_dates_unverified'));
 assert.ok(bad.blockers.includes('event_media_rights_unverified'));
 assert.ok(bad.blockers.includes('venue_removal_requires_review'));
});

test('R35 no guessed expiry for recurring events and no status without source proof',()=>{
 const recurring=plan({existing:{...existing,scheduleType:'recurring'},candidate:{...candidate,status:'expired'}});
 assert.equal(recurring.action,'hold');
 assert.ok(recurring.blockers.includes('explicit_event_status_evidence_required'));
});

test('R35 publishing cannot be toggled by updates to unverified / hidden events',()=>{
 const p=plan({existing:{...existing,publicationStatus:'hidden',verificationStatus:'needs_review'}});
 assert.equal(p.action,'hold');assert.ok(p.blockers.includes('existing_event_not_verified_published'));
});

test('R36 an unprovided price must not erase a previously verified fee status',()=>{
 const r=plan({candidate:{...candidate,priceType:'unknown',startAt:'2026-11-02'}});
 assert.equal(r.action,'hold');
 assert.ok(r.blockers.includes('verified_price_removal_requires_review'));
});
