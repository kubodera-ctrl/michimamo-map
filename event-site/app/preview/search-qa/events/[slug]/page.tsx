import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {
  ACCESSIBILITY_LABELS,AGE_OPTIONS,CATEGORY_OPTIONS,EXPERIENCE_LABELS,LOCATION_PRECISION_LABELS,PRICE_LABELS,
  japanToday,isTrustedLocation
} from '@/lib/events';
import {eventLabels,formatDurationLocalized,formatEventDateLocalized} from '@/lib/event-labels';
import {buildQaEvents,qaEventBySlug} from '@/lib/machiibe-search-qa-data';
import {EventMedia} from '@/components/EventMedia';
import {machimamoMapUrl} from '@/lib/url-config';

export const metadata:Metadata={title:'イベント詳細 QA',robots:{index:false,follow:false}};
type Params=Promise<{slug:string}>;
type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const categoryLabels={...Object.fromEntries(CATEGORY_OPTIONS),...EXPERIENCE_LABELS} as Record<string,string>;
const ageLabels=Object.fromEntries(AGE_OPTIONS) as Record<string,string>;

export default async function QaEventDetail({params,searchParams}:{params:Params;searchParams:SearchParams}){
  if(process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true')notFound();
  const {slug}=await params;
  const event=qaEventBySlug(buildQaEvents(japanToday()),slug);
  if(!event)notFound();

  const sp=await searchParams;
  const rawReturn=Array.isArray(sp.return)?sp.return[0]||'':sp.return||'';
  const returnTo=rawReturn.startsWith('/preview/search-qa')&&!rawReturn.startsWith('//')?rawReturn:'/preview/search-qa';
  const labels=eventLabels('ja');
  const address=[event.prefecture,event.municipality,event.address].filter(Boolean).join(' ');
  const mapUrl=new URL(machimamoMapUrl());
  mapUrl.searchParams.set('from','machiibe-qa');
  mapUrl.searchParams.set('eventSlug',event.slug);
  if(isTrustedLocation(event)){
    mapUrl.searchParams.set('lat',String(event.latitude));
    mapUrl.searchParams.set('lng',String(event.longitude));
    mapUrl.searchParams.set('event',event.title);
  }

  return (
    <main className="detail-wrap">
      <nav className="breadcrumb"><Link href={returnTo}>← 同じ検索条件へ戻る</Link><span>›</span><span>{event.title}</span></nav>
      <div className="admin-warning">fixtureOnly=true / {event.qaKind==='verified_ci'?'CI verified factual fixture':'synthetic QA fixture'}。Production・SNS・ASP・SEOには入りません。</div>
      <article className="detail-card">
        <EventMedia event={event} detail eager />
        <div className="detail-body">
          <div className="tag-row">
            <span className="tag">{formatDurationLocalized(event.duration_days,'ja')}</span>
            <span className={'tag tag-price tag-price-'+event.price_type}>{PRICE_LABELS[event.price_type]}</span>
            {event.indoor===true&&<span className="tag">屋内</span>}
            {event.audience_intent==='child_centered'&&<span className="tag tag-family">子どもが主役</span>}
            {event.audience_intent==='family_friendly'&&<span className="tag tag-family">ファミリー向け</span>}
            {event.accessibility_keys.length>0&&<span className="tag tag-accessibility">配慮情報あり</span>}
            {event.category_keys.map((key)=><span className="tag" key={key}>{labels.category[key]||labels.experience[key]||categoryLabels[key]||key}</span>)}
          </div>
          <h1>{event.title}</h1>
          {event.summary&&<p className="detail-summary">{event.summary}</p>}
          <dl className="event-facts">
            <div><dt>日時</dt><dd>{formatEventDateLocalized(event.start_date,event.end_date,'ja')}{event.start_time?' '+event.start_time.slice(0,5)+(event.end_time?'〜'+event.end_time.slice(0,5):''):''}</dd></div>
            <div><dt>開催期間</dt><dd>{formatDurationLocalized(event.duration_days,'ja')}</dd></div>
            <div><dt>会場</dt><dd>{event.venue_name||'公式情報を確認'}</dd></div>
            <div><dt>場所</dt><dd>{address||'未確認'}<br/><small>{LOCATION_PRECISION_LABELS[event.location_precision]}</small></dd></div>
            <div><dt>料金</dt><dd>{PRICE_LABELS[event.price_type]}{event.price_text?<><br/>{event.price_text}</>:null}</dd></div>
            <div><dt>対象年齢</dt><dd>{event.age_group_keys.length?event.age_group_keys.map((key)=>ageLabels[key]||key).join('・'):'未確認'}</dd></div>
            <div><dt>カテゴリ / タグ</dt><dd>{event.category_keys.length?event.category_keys.map((key)=>labels.category[key]||labels.experience[key]||categoryLabels[key]||key).join('・'):'未確認'}</dd></div>
            <div><dt>屋内 / 屋外</dt><dd>{event.indoor===true?'屋内':event.indoor===false?'屋外':'未確認'}</dd></div>
            <div><dt>雨天情報</dt><dd>{event.qaKind==='synthetic'&&event.slug==='qa-synthetic-tomorrow-mall-rain'?'synthetic QA: 雨の日・屋内条件確認用':'未確認（屋内/屋外だけから雨天可否を推測しません）'}</dd></div>
            <div><dt>障害者配慮</dt><dd>{event.accessibility_keys.length?event.accessibility_keys.map((key)=>ACCESSIBILITY_LABELS[key]||key).join('・'):'未確認'}{event.accessibility_notes?<><br/>{event.accessibility_notes}</>:null}</dd></div>
            <div><dt>Source</dt><dd>{event.qaKind==='verified_ci'?<a href={event.source_url} target="_blank" rel="noreferrer">{event.source_name}</a>:event.source_name}<br/><small>{event.qaNote}</small></dd></div>
          </dl>

          <section className="machimamo-day-support">
            <div><span>まちイベ → まちまも</span><h2>会場周辺の安心情報を確認</h2><p>WBGT・AED・交番/警察署・周辺MAPを確認できます。位置未確認fixtureは推測座標を渡しません。</p></div>
            <a href={mapUrl.toString()}>まちまもMAPへ →</a>
          </section>

          <div className="detail-actions">
            {event.qaKind==='verified_ci'
              ? <a className="primary-action" href={event.official_url} target="_blank" rel="noreferrer">公式情報を見る</a>
              : <span className="primary-action" aria-disabled="true">syntheticのため公式URLなし</span>}
            <Link className="secondary-action" href={returnTo}>検索結果へ戻る</Link>
          </div>
        </div>
      </article>
    </main>
  );
}
