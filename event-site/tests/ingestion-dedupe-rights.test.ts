import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCacheMedia,canUseMediaForSns,detectEventChanges,duplicateConfidence,duplicateReviewRequired,
  duplicateSignals,selectDisplayMedia,type MediaCandidate
} from '../../shared/machiibe-ingestion/contracts';

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
