import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCE_FETCH_METHODS,SOURCE_STAGES,conditionalHeaders,duplicateReviewRequired,sourceAutomationAllowed,sourceMediaRightsReadiness,sourceStageReadiness,validateNormalizedCandidate
} from '../../shared/machiibe-ingestion/contracts';

test('ingestion adapter contract contains all planned source methods',()=>{
  assert.deepEqual(SOURCE_FETCH_METHODS,['OPEN_DATA','RSS','ICS','JSON_API','JSON_LD','HTML_STRUCTURED','MANUAL','PARTNER']);
  assert.deepEqual(SOURCE_STAGES,['CANDIDATE','TERMS_REVIEWED','FETCH_ALLOWED','DRY_RUN_PASS','PREVIEW_ENABLED','PRODUCTION_REVIEW']);
});

test('source automation fails closed unless compliance gates are approved',()=>{
  const source={
    sourceId:1,sourceName:'x',sourceType:'open_data',prefecture:null,municipality:null,
    baseUrl:'https://example.test',feedUrl:'https://example.test/feed',fetchMethod:'OPEN_DATA' as const,
    termsStatus:'reviewed_allowed' as const,robotsStatus:'allowed' as const,commercialUseStatus:'allowed' as const,
    reuseStatus:'allowed' as const,redistributionStatus:'allowed' as const,cacheStatus:'allowed' as const,
    imageUseStatus:'not_applicable' as const,snsUseStatus:'not_applicable' as const,
    attributionRequirement:null,sourceStage:'FETCH_ALLOWED' as const,lastTermsCheckedAt:'2026-09-28T00:00:00Z',
    updateFrequencyMinutes:60,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,
    active:true,priority:50,automatedFetchAllowed:true,etag:null,lastModified:null
  };
  assert.equal(sourceAutomationAllowed(source),true);
  assert.equal(sourceAutomationAllowed({...source,robotsStatus:'disallowed'}),false);
  assert.equal(sourceAutomationAllowed({...source,robotsStatus:'pending'}),false);
  assert.equal(sourceAutomationAllowed({...source,sourceStage:'TERMS_REVIEWED'}),false);
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

test('source promotion readiness keeps unknown rights as blockers',()=>{
  const source:any={
    sourceId:2,sourceName:'candidate',sourceType:'open_data',prefecture:'鳥取県',municipality:null,
    baseUrl:'https://example.test',feedUrl:'https://example.test/data.csv',fetchMethod:'OPEN_DATA',
    termsStatus:'reviewed_allowed',robotsStatus:'pending',commercialUseStatus:'allowed',
    reuseStatus:'allowed',redistributionStatus:'allowed',cacheStatus:'allowed',
    imageUseStatus:'not_applicable',snsUseStatus:'not_applicable',
    attributionRequirement:'CC BY',sourceStage:'TERMS_REVIEWED',lastTermsCheckedAt:'2026-09-28T00:00:00Z',
    updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,active:true,priority:90,
    automatedFetchAllowed:false,etag:null,lastModified:null
  };
  const pending=sourceStageReadiness(source);
  assert.equal(pending.readyForFetch,false);
  assert.ok(pending.missing.includes('robots'));
  const ready=sourceStageReadiness({...source,robotsStatus:'not_applicable'});
  assert.equal(ready.readyForFetch,true);
});


test('unknown media rights do not block lawful event facts but media stays fail closed',()=>{
  const source:any={
    sourceId:3,sourceName:'facts-only',sourceType:'open_data',prefecture:'三重県',municipality:null,
    baseUrl:'https://example.test',feedUrl:'https://example.test/events.csv',fetchMethod:'OPEN_DATA',
    termsStatus:'reviewed_allowed',robotsStatus:'not_applicable',commercialUseStatus:'allowed',
    reuseStatus:'allowed',redistributionStatus:'allowed',cacheStatus:'allowed',
    imageUseStatus:'unknown',snsUseStatus:'unknown',
    attributionRequirement:'CC BY',sourceStage:'FETCH_ALLOWED',lastTermsCheckedAt:'2026-09-29T00:00:00Z',
    updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,active:true,priority:100,
    automatedFetchAllowed:true,etag:null,lastModified:null
  };
  assert.equal(sourceStageReadiness(source).readyForFetch,true);
  assert.equal(sourceAutomationAllowed(source),true);
  assert.deepEqual(sourceMediaRightsReadiness(source),{
    displayKnown:false,cacheKnown:false,snsKnown:false,snsAllowed:false
  });
});
