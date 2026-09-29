import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSupplyCandidate,summarizeSupplyBatch} from '../../shared/machiibe-ingestion/supply-quality';

const source:any={
  sourceId:1,sourceName:'ready',sourceType:'open_data',prefecture:'三重県',municipality:null,
  baseUrl:'https://official.test/open',feedUrl:'https://official.test/events.csv',fetchMethod:'OPEN_DATA',
  termsStatus:'reviewed_allowed',robotsStatus:'not_applicable',commercialUseStatus:'allowed',
  reuseStatus:'allowed',redistributionStatus:'allowed',cacheStatus:'allowed',
  imageUseStatus:'not_applicable',snsUseStatus:'not_applicable',
  attributionRequirement:'CC BY',sourceStage:'FETCH_ALLOWED',lastTermsCheckedAt:'2026-09-29',
  updateFrequencyMinutes:1440,lastCheckedAt:null,lastSuccessAt:null,failureCount:0,
  active:true,priority:100,automatedFetchAllowed:true,etag:null,lastModified:null
};

const candidate:any={
  sourceId:1,sourceEventId:null,sourceUrl:'https://official.test/events.csv',
  sourceUpdatedAt:null,sourceHash:'dryrun',title:'Event',description:null,
  startAt:'2026-10-10',endAt:'2026-10-10',timezone:'Asia/Tokyo',
  prefecture:'三重県',municipality:'津市',address:null,lat:null,lng:null,
  venueName:'会場',venueType:null,category:null,tags:[],ageMin:null,ageMax:null,
  family:null,childFocused:null,indoor:null,rainOk:null,accessibility:[],
  priceType:'unknown',priceMin:null,priceMax:null,imageUrl:null,imageRightsStatus:'unknown',
  officialUrl:null,verifiedAt:null,expiresAt:null,status:'candidate'
};

test('supply quality does not count a feed URL as an event official URL',()=>{
  const assessed=assessSupplyCandidate(candidate,source,'2026-09-29');
  assert.equal(assessed.normalized,true);
  assert.equal(assessed.valid,false);
  assert.equal(assessed.publishable,false);
  assert.ok(assessed.errors.includes('official_url_missing'));
});

test('batch metrics keep normalized records separate from valid/publishable records',()=>{
  assert.deepEqual(summarizeSupplyBatch(1,[candidate],source,'2026-09-29',66),{
    potential:66,fetched:1,normalized:1,valid:0,publishable:0
  });
});
