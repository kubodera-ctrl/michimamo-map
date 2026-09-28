import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCE_FETCH_METHODS,conditionalHeaders,duplicateReviewRequired,sourceAutomationAllowed,validateNormalizedCandidate
} from '../../shared/machiibe-ingestion/contracts';

test('ingestion adapter contract contains all planned source methods',()=>{
  assert.deepEqual(SOURCE_FETCH_METHODS,['OPEN_DATA','RSS','ICS','JSON_API','JSON_LD','HTML_STRUCTURED','MANUAL','PARTNER']);
});

test('source automation fails closed unless compliance gates are approved',()=>{
  const source={
    sourceId:1,sourceName:'x',sourceType:'open_data',prefecture:null,municipality:null,
    baseUrl:'https://example.test',feedUrl:'https://example.test/feed',fetchMethod:'OPEN_DATA' as const,
    termsStatus:'reviewed_allowed' as const,robotsStatus:'allowed' as const,commercialUseStatus:'allowed' as const,
    attributionRequirement:null,updateFrequencyMinutes:60,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,
    active:true,priority:50,automatedFetchAllowed:true,etag:null,lastModified:null
  };
  assert.equal(sourceAutomationAllowed(source),true);
  assert.equal(sourceAutomationAllowed({...source,robotsStatus:'disallowed'}),false);
  assert.equal(sourceAutomationAllowed({...source,termsStatus:'pending'}),false);
  assert.equal(sourceAutomationAllowed({...source,commercialUseStatus:'disallowed'}),false);
});

test('conditional fetch uses ETag and Last-Modified without source secrets',()=>{
  assert.deepEqual(conditionalHeaders({etag:'abc',lastModified:'Tue, 01 Sep 2026 00:00:00 GMT'}),{
    accept:'*/*','if-none-match':'abc','if-modified-since':'Tue, 01 Sep 2026 00:00:00 GMT'
  });
});

test('canonical validation rejects partial coordinates and unverified remote images',()=>{
  const base:any={
    sourceId:1,sourceEventId:'1',sourceUrl:'https://example.test/e/1',sourceUpdatedAt:null,sourceHash:'a'.repeat(64),
    title:'event',description:null,startAt:'2026-10-01T10:00:00+09:00',endAt:'2026-10-01T11:00:00+09:00',
    timezone:'Asia/Tokyo',prefecture:'東京都',municipality:'港区',address:null,lat:null,lng:null,
    venueName:'x',venueType:null,category:null,tags:[],ageMin:null,ageMax:null,family:null,childFocused:null,
    indoor:null,rainOk:null,accessibility:[],priceType:'unknown',priceMin:null,priceMax:null,imageUrl:null,
    imageRightsStatus:'unknown',officialUrl:null,verifiedAt:null,expiresAt:null,status:'candidate'
  };
  assert.equal(validateNormalizedCandidate(base).ok,true);
  assert.ok(validateNormalizedCandidate({...base,lat:35}).errors.includes('partial_coordinate'));
  assert.ok(validateNormalizedCandidate({...base,imageUrl:'https://example.test/a.jpg'}).errors.includes('image_rights_unverified'));
  assert.equal(duplicateReviewRequired(.96),true);
  assert.equal(duplicateReviewRequired(.98),false);
});
