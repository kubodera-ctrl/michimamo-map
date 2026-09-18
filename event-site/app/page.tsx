import type { Metadata } from 'next';
import Link from 'next/link';
import { DataUnavailable } from '@/components/DataUnavailable';
import { EventCard } from '@/components/EventCard';
import { EventFilters } from '@/components/EventFilters';
import { MetricPing } from '@/components/MetricPing';
import { NewSinceLastVisitLink } from '@/components/NewSinceLastVisitLink';
import { Pagination } from '@/components/Pagination';
import { PickupEvents } from '@/components/PickupEvents';
import { SeoBrowseLinks } from '@/components/SeoBrowseLinks';
import { VisitTracker } from '@/components/VisitTracker';
import { AGE_OPTIONS, CATEGORY_OPTIONS, FANDOM_LABELS, PRICE_LABELS, parseExcludeTerms, parsePage, resolveDateRange, searchEventsPage } from '@/lib/events';
import type { PriceType } from '@/lib/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
const priceValues:PriceType[]=['free','partly_free','paid','unknown'];
const categoryLabels=Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;
const ageLabels=Object.fromEntries(AGE_OPTIONS) as Record<string,string>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const hasFilters = Object.entries(params).some(([key,value]) => {
    if (key === 'page') return false;
    if (Array.isArray(value)) return value.some(Boolean);
    return Boolean(value);
  });
  const page=parsePage(params.page);
  return { alternates:{canonical:'/'}, robots:hasFilters||page>1?{index:false,follow:true}:{index:true,follow:true} };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const dateMode = one(params.when) || 'today';
  const prefecture = one(params.prefecture);
  const keyword = one(params.q);
  const excludeWords = one(params.exclude);
  const category = one(params.category);
  const age = one(params.age);
  const duration = one(params.duration);
  const fandom = one(params.oshi);
  const legacyFree = one(params.free) === '1';
  const priceRaw = one(params.price) || (legacyFree ? 'free' : '');
  const price = priceValues.includes(priceRaw as PriceType) ? priceRaw as PriceType : '';
  const accessibilityOnly = one(params.accessibility) === '1';
  const accessibilityFeature = one(params.accessibilityFeature);
  const childFocusOnly = one(params.childFocus) === '1';
  const excludeAdultOriented = one(params.excludeAdult) === '1';
  const indoorOnly = one(params.indoor) === '1';
  const sort = one(params.sort) || 'recommended';
  const page=parsePage(params.page);
  const hasExplicitSearch=Object.entries(params).some(([key,value]) => key!=='page' && key!=='since' && (Array.isArray(value)?value.some(Boolean):Boolean(value)));
  const sinceRaw=one(params.since);
  const since=sinceRaw && Number.isFinite(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : '';
  const range = resolveDateRange(dateMode);
  const searchAnalyticsTerm=keyword || [
    range.label,
    prefecture,
    category ? categoryLabels[category] : '',
    age ? ageLabels[age] : '',
    fandom ? FANDOM_LABELS[fandom] : '',
    price ? PRICE_LABELS[price] : '',
    indoorOnly ? '室内' : '',
    childFocusOnly ? '子どもが主役' : '',
    accessibilityOnly || accessibilityFeature ? '配慮情報' : ''
  ].filter(Boolean).join(' ');

  const result = await searchEventsPage({
    startDate: range.startDate,endDate: range.endDate,prefecture,keyword,
    excludeTerms: parseExcludeTerms(excludeWords),categories: category ? [category] : undefined,
    ageGroups: age ? [age] : undefined,durationBuckets: duration ? [duration] : undefined,
    fandomSlugs: fandom ? [fandom] : undefined,priceTypes: price ? [price] : undefined,
    updatedAfter: since || undefined,
    accessibilityOnly: accessibilityOnly || Boolean(accessibilityFeature),
    accessibilityKeys: accessibilityFeature ? [accessibilityFeature] : undefined,
    audienceIntents: childFocusOnly ? ['child_centered'] : undefined,
    excludeAdultOriented,indoorOnly,
    sort: sort === 'start_date' || sort === 'short_first' || sort === 'newest' ? sort : 'recommended'
  },page,24);

  const groupLongRunning = sort === 'recommended' && !duration;
  const regularEvents = groupLongRunning ? result.events.filter((event) => event.duration_days <= 10) : result.events;
  const longRunningEvents = groupLongRunning ? result.events.filter((event) => event.duration_days >= 11) : [];

  const paginationQuery:Record<string,string|undefined>={
    when:dateMode !== 'today' ? dateMode : undefined,prefecture:prefecture||undefined,q:keyword||undefined,
    exclude:excludeWords||undefined,category:category||undefined,age:age||undefined,duration:duration||undefined,
    oshi:fandom||undefined,price:price||undefined,accessibility:accessibilityOnly?'1':undefined,
    accessibilityFeature:accessibilityFeature||undefined,childFocus:childFocusOnly?'1':undefined,
    excludeAdult:excludeAdultOriented?'1':undefined,indoor:indoorOnly?'1':undefined,
    sort:sort!=='recommended'?sort:undefined,since:since||undefined
  };

  return (
    <main>
      <VisitTracker />
      {page===1 && hasExplicitSearch && <MetricPing metric="search" searchTerm={searchAnalyticsTerm||undefined} />}
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">MACHI IBE</p>
          <h1>今日、どこ行く？<br />全国のイベントをひとつに。</h1>
          <p className="hero-copy">地域の小さなお祭りから大型イベントまで。見たいものを残し、見たくないものは除外できるイベント検索を目指します。</p>
          <EventFilters values={{dateMode,prefecture,keyword,excludeWords,category,age,duration,fandom,price,accessibilityOnly,accessibilityFeature,childFocusOnly,excludeAdultOriented,indoorOnly,sort}} />
        </div>
      </section>

      <section className="content-wrap">
        <PickupEvents />
        <div className="result-tools">
          <NewSinceLastVisitLink active={Boolean(since)} />
          <Link href="/saved">♡ 行きたい一覧</Link>
          <Link href="/saved-searches">☆ 保存した検索</Link>
          <Link href="/plan">📅 おでかけプラン</Link>
        </div>
        <div className="section-heading">
          <div><span className="result-kicker">{since?'前回訪問後の新着':range.label}</span><h2>{prefecture || '全国'}のイベント</h2></div>
          <span className="result-count" aria-live="polite">{result.events.length}件表示・{result.page}ページ目</span>
        </div>

        {result.error ? <DataUnavailable /> : result.events.length ? (
          <>
            {regularEvents.length > 0 && <div className="event-grid">{regularEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>}
            {longRunningEvents.length > 0 && (
              <details className="long-running-group">
                <summary><span><strong>長期開催のイベント</strong><small>11日以上のイベントは、繰り返し検索の邪魔になりにくいよう分けて表示します。</small></span><b>{longRunningEvents.length}件</b></summary>
                <div className="event-grid long-running-grid">{longRunningEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>
              </details>
            )}
            <Pagination basePath="/" page={result.page} hasPrevious={result.hasPrevious} hasNext={result.hasNext} query={paginationQuery} />
          </>
        ) : (
          <div className="empty-state"><div className="empty-icon">◎</div><h2>条件に合う公開イベントはまだありません</h2><p>条件を少し緩めるか、除外ワード・開催期間を見直してください。出典と利用条件を確認できたイベントだけを順次公開します。</p></div>
        )}
        <SeoBrowseLinks />
      </section>
    </main>
  );
}
