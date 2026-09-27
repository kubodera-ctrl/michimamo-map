import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import MachiibeFinalCarouselRenderer from '@/components/MachiibeFinalCarouselRenderer';
import {
  MACHIIBE_CAROUSEL_MASTER_VERSION,
  MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
  MACHIIBE_ENDCARD_VERSION,
  type CarouselInput
} from '@/lib/machiibe-production-master';

export const metadata:Metadata={
  title:'CAROUSEL Golden Fixture Preview',
  robots:{index:false,follow:false}
};

function fixture(eventCount:number,label:string):CarouselInput{
  return {
    period:{
      periodType:'weekly',
      periodLabel:label,
      periodStart:'2026-09-28',
      periodEnd:'2026-10-04'
    },
    area:{
      prefecture:'東京都',
      prefectureCode:'13',
      municipalityName:'港区・江東区'
    },
    events:Array.from({length:eventCount},(_,index)=>({
      eventId:'fixture-'+String(eventCount)+'-'+String(index+1),
      title:index===0
        ? '親子で楽しむ秋の体験イベント・とても長いイベント名の文字切れ確認用フィクスチャ'
        : 'Golden Fixture イベント '+String(index+1),
      venueName:index===1
        ? '長い会場名称を想定した文化・公共施設イベントホール'
        : 'Fixture会場 '+String(index+1),
      municipality:index%2===0?'港区':'江東区',
      startDate:'2026-10-0'+String((index%4)+1),
      endDate:index===2?'2026-10-04':null,
      startTime:index%3===0?'10:00':null,
      endTime:index%3===0?'16:30':null,
      priceLabel:index%2===0?'無料（条件は公式情報を確認）':'有料・料金は公式情報を確認',
      ageLabel:index%3===0?'未就学・小学生・ファミリー':'公式情報を確認',
      reservationLabel:index%2===0?'予約不要（fixture）':'事前予約・公式情報を確認',
      indoorOutdoor:index%3===0?'indoor':index%3===1?'outdoor':'mixed',
      rainPolicy:index%3===0?'雨天でも開催想定のfixture':'公式情報を確認',
      officialUrl:'https://example.test/fixture/'+String(index+1),
      sourceName:'Golden Fixture',
      sourceCheckedAt:'2026-09-28T00:00:00+09:00',
      mediaUrl:null,
      mediaRightsStatus:'unknown',
      imageMode:'none',
      isCancelled:false,
      isPostponed:false,
      isEnded:false,
      verified:true
    })),
    production:{
      productionMasterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,
      templateVersion:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
      endcardVersion:MACHIIBE_ENDCARD_VERSION,
      requestedBy:'golden-fixture'
    }
  };
}

export default function GoldenFixturePreviewPage(){
  if(process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true') notFound();
  const fixtures=[
    {id:'normal-5p',input:fixture(4,'NORMAL 5P / 9月28日〜10月4日'),pageCount:5},
    {id:'extended-7p',input:fixture(8,'EXTENDED 7P / 秋のおでかけ特集'),pageCount:7},
    {id:'holiday-8p',input:fixture(10,'HOLIDAY 8P / 3連休イベント'),pageCount:8}
  ] as const;

  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">PREVIEW ONLY / SYNTHETIC DATA</p>
          <h1>CAROUSEL Golden Fixture Preview</h1>
          <p>実イベント・本番DBを使わないVisual Regression専用。index許可環境では404になります。</p>
        </div>
      </div>
      {fixtures.map((item)=>(
        <section className="admin-panel" key={item.id} data-fixture={item.id}>
          <h2>{item.id}</h2>
          <MachiibeFinalCarouselRenderer
            input={item.input}
            pageCount={item.pageCount}
            postSetId={'fixture-'+item.id}
            revisionId={'fixture-revision-'+item.id}
          />
        </section>
      ))}
    </main>
  );
}
