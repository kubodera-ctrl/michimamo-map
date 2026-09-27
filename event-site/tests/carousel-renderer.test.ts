import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMachiibeRenderPages,
  renderPageFileName
} from '../lib/machiibe-carousel-render-plan';
import {
  MACHIIBE_CAROUSEL_MASTER_VERSION,
  MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
  MACHIIBE_ENDCARD_VERSION,
  type CarouselInput
} from '../lib/machiibe-production-master';

function input(count:number):CarouselInput{
  return {
    period:{periodType:'weekly',periodLabel:'9/28〜10/4',periodStart:'2026-09-28',periodEnd:'2026-10-04'},
    area:{prefecture:'東京都',prefectureCode:'13'},
    events:Array.from({length:count},(_,index)=>({
      eventId:'ev-'+String(index+1),
      title:'イベント'+String(index+1),
      venueName:'会場'+String(index+1),
      municipality:'港区',
      startDate:'2026-09-28',
      priceLabel:'公式情報を確認',
      reservationLabel:'公式情報を確認',
      indoorOutdoor:index%2?'indoor':'outdoor',
      officialUrl:'https://example.test/'+String(index+1),
      sourceName:'公式',
      sourceCheckedAt:'2026-09-27T12:00:00+09:00',
      mediaRightsStatus:'unknown',
      imageMode:'none',
      isCancelled:false,isPostponed:false,isEnded:false,verified:true
    })),
    production:{
      productionMasterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,
      templateVersion:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
      endcardVersion:MACHIIBE_ENDCARD_VERSION
    }
  };
}

test('CURRENT renderer maps event counts to 5-8 pages with max two events per detail page',()=>{
  for(const [count,pageCount] of [[3,5],[4,5],[5,6],[6,6],[7,7],[8,7],[9,8],[10,8]] as const){
    const pages=buildMachiibeRenderPages(input(count),pageCount);
    assert.equal(pages.length,pageCount);
    assert.equal(pages[0].kind,'cover');
    assert.equal(pages[1].kind,'highlights');
    assert.equal(pages.at(-1)?.kind,'cta');
    const detail=pages.filter((page)=>page.kind==='events');
    assert.equal(detail.length,pageCount-3);
    assert.equal(detail.reduce((sum,page)=>sum+page.events.length,0),count);
    assert.ok(detail.every((page)=>page.events.length>=1&&page.events.length<=2));
  }
});

test('renderer refuses page counts that do not match CURRENT allocation',()=>{
  assert.throws(()=>buildMachiibeRenderPages(input(3),6),/pageCount does not match/);
  assert.throws(()=>buildMachiibeRenderPages(input(10),7),/pageCount does not match/);
});

test('render filenames are stable and include area period and page sequence',()=>{
  assert.equal(
    renderPageFileName(input(3),1,5),
    'machiibe_13_2026-09-28_2026-10-04_p01-of-05.png'
  );
});
