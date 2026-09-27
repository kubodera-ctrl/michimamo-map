import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MACHIIBE_CAROUSEL_MASTER_VERSION,
  MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
  MACHIIBE_ENDCARD_VERSION,
  MACHIIBE_VIDEO_CURRENT,
  isPublishEligible,
  planMachiibeCarousel,
  validateMachiibeCarouselInput
} from '../lib/machiibe-production-master';

test('CURRENT carousel page-count rules match Drive master',()=>{
  for(const count of [3,4]) assert.equal(planMachiibeCarousel(count).parts[0]?.pageCount,5);
  for(const count of [5,6]) assert.equal(planMachiibeCarousel(count).parts[0]?.pageCount,6);
  for(const count of [7,8]) assert.equal(planMachiibeCarousel(count).parts[0]?.pageCount,7);
  for(const count of [9,10]) assert.equal(planMachiibeCarousel(count).parts[0]?.pageCount,8);
});

test('11+ events split into balanced Parts instead of being forced into 8 pages',()=>{
  assert.deepEqual(planMachiibeCarousel(11).parts.map((part)=>part.eventCount),[6,5]);
  assert.deepEqual(planMachiibeCarousel(20).parts.map((part)=>part.eventCount),[10,10]);
  assert.deepEqual(planMachiibeCarousel(21).parts.map((part)=>part.eventCount),[7,7,7]);
  assert.ok(planMachiibeCarousel(11).parts.every((part)=>part.pageCount<=8));
});

test('CURRENT does not invent a carousel layout for fewer than 3 events',()=>{
  assert.equal(planMachiibeCarousel(2).eligible,false);
  assert.equal(planMachiibeCarousel(0).eligible,false);
});

test('facts and rights gates block unverifiable carousel inputs',()=>{
  const input={
    period:{periodType:'weekly' as const,periodLabel:'9/28〜10/4',periodStart:'2026-09-28',periodEnd:'2026-10-04'},
    area:{prefecture:'東京都',prefectureCode:'13'},
    events:Array.from({length:3},(_,index)=>({
      eventId:`event-${index+1}`,
      title:`イベント${index+1}`,
      venueName:'確認済み会場',
      municipality:'江東区',
      startDate:'2026-10-01',
      priceLabel:'料金は公式情報を確認',
      reservationLabel:'予約条件は公式情報を確認',
      indoorOutdoor:'indoor' as const,
      officialUrl:'https://example.com/event',
      sourceName:'公式',
      sourceCheckedAt:'2026-09-27T12:00:00+09:00',
      mediaUrl:null,
      mediaRightsStatus:'unknown' as const,
      imageMode:'none' as const,
      imageDisclaimer:null,
      isCancelled:false,
      isPostponed:false,
      isEnded:false,
      verified:true
    })),
    production:{
      productionMasterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,
      templateVersion:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
      endcardVersion:MACHIIBE_ENDCARD_VERSION
    }
  };
  assert.equal(validateMachiibeCarouselInput(input).ok,true);

  input.events[0].verified=false;
  assert.equal(validateMachiibeCarouselInput(input).ok,false);
  input.events[0].verified=true;
  input.events[0].imageMode='official';
  assert.equal(validateMachiibeCarouselInput(input).ok,false);
});

test('general and AI-general images require an image disclaimer',()=>{
  const base={
    period:{periodType:'weekly' as const,periodLabel:'test',periodStart:'2026-09-28',periodEnd:'2026-10-04'},
    area:{prefecture:'東京都',prefectureCode:'13'},
    events:Array.from({length:3},(_,index)=>({
      eventId:`event-${index+1}`,title:'event',venueName:'venue',municipality:'city',
      startDate:'2026-10-01',priceLabel:'unknown',reservationLabel:'official',
      indoorOutdoor:'unknown' as const,officialUrl:'https://example.com',sourceName:'official',
      sourceCheckedAt:'2026-09-27T12:00:00+09:00',mediaUrl:null,mediaRightsStatus:'unknown' as const,
      imageMode:'ai_general' as const,imageDisclaimer:index===0?null:'※画像はイメージです',
      isCancelled:false,isPostponed:false,isEnded:false,verified:true
    })),
    production:{productionMasterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,templateVersion:MACHIIBE_CAROUSEL_TEMPLATE_VERSION}
  };
  assert.equal(validateMachiibeCarouselInput(base).ok,false);
  base.events[0].imageDisclaimer='※画像はイメージです';
  assert.equal(validateMachiibeCarouselInput(base).ok,true);
});

test('publishEligible requires every QC gate plus admin approval',()=>{
  assert.equal(isPublishEligible({
    facts:'pass',rights:'pass',visual:'pass',golden:'pass',pageCount:'pass',disclaimer:'pass',adminApproval:true
  }),true);
  assert.equal(isPublishEligible({
    facts:'pass',rights:'pass',visual:'pass',golden:'pending',pageCount:'pass',disclaimer:'pass',adminApproval:true
  }),false);
});

test('Machiibe VIDEO stays inactive until a formal Machiibe VIDEO CURRENT exists',()=>{
  assert.equal(MACHIIBE_VIDEO_CURRENT.active,false);
  assert.match(MACHIIBE_VIDEO_CURRENT.reason,/Do not substitute/);
});
