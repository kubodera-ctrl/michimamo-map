import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCacheMedia,canUseMediaForSns,detectEventChanges,duplicateConfidence,duplicateReviewRequired,
  duplicateSignals,selectDisplayMedia,type MediaCandidate
} from '../../shared/machiibe-ingestion/contracts';
import {dedupeCrossSourceCandidates} from '../../shared/machiibe-ingestion/dedupe';

const rights=(patch:any={})=>({
  displayAllowed:null,cacheAllowed:null,commercialAllowed:null,snsAllowed:null,
  attributionRequired:null,attributionText:null,rightsSourceUrl:null,reviewedAt:null,...patch
});

test('image fallback order is event image -> venue/place -> owned category -> generic and rights stay independent',()=>{
  const candidates:MediaCandidate[]=[
    {id:'blocked-event',subjectType:'event',role:'event_official',url:'https://example.test/e.jpg',rights:rights(),machiibeOwned:false},
    {id:'venue',subjectType:'venue',role:'venue_official',url:'https://example.test/v.jpg',rights:rights({displayAllowed:true,cacheAllowed:false,snsAllowed:false,commercialAllowed:true}),machiibeOwned:false},
    {id:'category',subjectType:'category',role:'category_visual',url:null,rights:rights(),machiibeOwned:true},
    {id:'generic',subjectType:'generic',role:'generic_fallback',url:null,rights:rights(),machiibeOwned:true}
  ];
  assert.equal(selectDisplayMedia(candidates)?.id,'venue');
  assert.equal(canCacheMedia(candidates[1]),false);
  assert.equal(canUseMediaForSns(candidates[1]),false);
  assert.equal(canUseMediaForSns(candidates[2]),true);
});

test('dedup dry-run auto-merges only extremely strong matches',()=>{
  const a={sourceEventId:'abc',officialUrl:'https://official.test/e',title:'秋の親子体験フェス',startAt:'2026-10-10T10:00:00+09:00',endAt:'2026-10-10T16:00:00+09:00',venueName:'中央公園',municipality:'港区',lat:35.65,lng:139.75,organizer:'実行委員会'};
  const b={...a,sourceEventId:'other-source-id'};
  const strong=duplicateConfidence(duplicateSignals(a,b));
  assert.ok(strong>=.97);
  assert.equal(duplicateReviewRequired(strong),false);

  const ambiguous={...b,officialUrl:'https://tourism.test/another',title:'秋の親子イベント',venueName:'別会場',lat:null,lng:null,organizer:'観光協会'};
  const weak=duplicateConfidence(duplicateSignals(a,ambiguous));
  assert.ok(weak<.97);
  assert.equal(duplicateReviewRequired(weak),true);
});

test('update/cancel dry-run uses source hash and emits auditable change kinds',()=>{
  const before={sourceHash:'aaa',title:'イベント',startAt:'2026-10-10T10:00:00+09:00',endAt:'2026-10-10T16:00:00+09:00',venueName:'A',priceType:'free',priceMin:0,priceMax:0,status:'verified'};
  assert.equal(detectEventChanges(before,{...before}).changed,false);
  const changed=detectEventChanges(before,{...before,sourceHash:'bbb',startAt:'2026-10-11T10:00:00+09:00',endAt:'2026-10-11T16:00:00+09:00',status:'cancelled'});
  assert.equal(changed.changed,true);
  assert.ok(changed.kinds.includes('date_changed'));
  assert.ok(changed.kinds.includes('cancelled'));
  assert.ok(changed.fields.includes('status'));
});


test('cross-source batch dedupe auto-merges strong pairs and queues ambiguous pairs for review',()=>{
  const strongA={candidateId:'a',sourceId:11,sourceEventId:'a1',officialUrl:'https://official.test/e',title:'秋の親子体験フェス',startAt:'2026-10-10',endAt:'2026-10-10',venueName:'中央公園',municipality:'港区',lat:35.65,lng:139.75,organizer:'実行委員会'};
  const strongB={...strongA,candidateId:'b',sourceId:22,sourceEventId:'b9'};
  const ambiguous={...strongA,candidateId:'c',sourceId:33,sourceEventId:'c3',officialUrl:'https://another.test/e',title:'秋の親子体験イベント',venueName:'中央公園 特設会場',lat:null,lng:null,organizer:'観光協会'};
  const otherMunicipality={...strongA,candidateId:'d',sourceId:44,municipality:'江東区'};
  const sameSource={...strongA,candidateId:'e',sourceId:11};

  const result=dedupeCrossSourceCandidates([strongA,strongB,ambiguous,otherMunicipality,sameSource],{
    reviewThreshold:.5,
    autoMergeThreshold:.97
  });
  assert.ok(result.autoMergePairs.some((pair)=>pair.leftId==='a'&&pair.rightId==='b'));
  assert.ok(result.reviewPairs.some((pair)=>pair.leftId==='a'&&pair.rightId==='c'));
  assert.equal(result.autoMergePairs.some((pair)=>pair.leftId==='a'&&pair.rightId==='e'),false);
  assert.equal(result.reviewPairs.some((pair)=>pair.leftId==='a'&&pair.rightId==='d'),false);
  assert.ok(result.clusters.some((cluster)=>cluster.includes('a')&&cluster.includes('b')));
  assert.equal(result.clusters.some((cluster)=>cluster.includes('a')&&cluster.includes('e')),false);
  assert.ok(result.reviewPairs.some((pair)=>
    pair.reviewReason==='source_cluster_conflict'
    && ((pair.leftId==='b'&&pair.rightId==='e')||(pair.leftId==='a'&&pair.rightId==='e'))
  ));
  assert.equal(result.uniqueAfterAutoMerge,4);
});

test('cross-source dedupe rejects unsafe threshold configuration',()=>{
  assert.throws(()=>dedupeCrossSourceCandidates([],{
    reviewThreshold:.98,
    autoMergeThreshold:.97
  }),/invalid dedupe thresholds/);
});
