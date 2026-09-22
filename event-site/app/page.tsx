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
import { HomePrSlot } from '@/components/HomePrSlot';
import { FeaturedStories } from '@/components/FeaturedStories';
import { MachimamoBridge } from '@/components/MachimamoBridge';
import { AGE_OPTIONS, CATEGORY_OPTIONS, EXPERIENCE_LABELS, FANDOM_LABELS, PRICE_LABELS, VENUE_TYPE_LABELS, VENUE_TYPE_OPTIONS, parseExcludeTerms, parsePage, resolveDateRange, searchEventsPage } from '@/lib/events';
import type { PriceType, VenueTypeKey } from '@/lib/types';
import { searchIndexingAllowed } from '@/lib/url-config';
import { getRequestLocale } from '@/lib/i18n-server';
import { getMessages } from '@/lib/i18n';
import { localePath } from '@/lib/i18n-config';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
const many = (value:string|string[]|undefined) => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
const priceValues:PriceType[]=['free','partly_free','paid','unknown'];
const categoryLabels=Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;
const ageLabels=Object.fromEntries(AGE_OPTIONS) as Record<string,string>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const locale=await getRequestLocale();
  const messages=getMessages(locale);
  const params = await searchParams;
  const hasFilters = Object.entries(params).some(([key,value]) => {
    if (key === 'page') return false;
    if (Array.isArray(value)) return value.some(Boolean);
    return Boolean(value);
  });
  const page=parsePage(params.page);
  const allowIndexing=searchIndexingAllowed();
  return {
    title:messages.homeTitle,
    description:messages.homeDescription,
    alternates:{canonical:localePath('/',locale),languages:{'ja-JP':'/',en:'/en','zh-Hans':'/zh-cn','zh-Hant':'/zh-tw',ko:'/ko','x-default':'/'}},
    robots:allowIndexing && !hasFilters && page===1?{index:true,follow:true}:{index:false,follow:allowIndexing}
  };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const locale=await getRequestLocale();
  const messages=getMessages(locale);
  const params = await searchParams;
  const customStartRaw=one(params.from).slice(0,10);
  const customEndRaw=one(params.to).slice(0,10);
  const dateMode = one(params.when) || (customStartRaw || customEndRaw ? 'custom' : 'today');
  const prefecture = one(params.prefecture);
  const keyword = one(params.q).trim().slice(0,100);
  const excludeWords = one(params.exclude).slice(0,500);
  const category = one(params.category);
  const experience = one(params.experience);
  const age = one(params.age);
  const duration = one(params.duration);
  const fandom = one(params.oshi);
  const fandomKeyword = one(params.oshiKeyword).trim().slice(0,80);
  const legacyFree = one(params.free) === '1';
  const priceRaw = one(params.price) || (legacyFree ? 'free' : '');
  const price = priceValues.includes(priceRaw as PriceType) ? priceRaw as PriceType : '';
  const accessibilityOnly = one(params.accessibility) === '1';
  const accessibilityFeature = one(params.accessibilityFeature);
  const childFocusOnly = one(params.childFocus) === '1';
  const familyFriendlyOnly = one(params.family) === '1';
  const excludeAdultOriented = one(params.excludeAdult) === '1';
  const indoorOnly = one(params.indoor) === '1';
  const rainyDayOnly = one(params.rainy) === '1';
  const venueFilterActive=one(params.venueFilter)==='1';
  const venueAllowed=new Set<VenueTypeKey>(VENUE_TYPE_OPTIONS.map(([key])=>key));
  const venueTypes=many(params.venue).filter((value):value is VenueTypeKey=>venueAllowed.has(value as VenueTypeKey));
  const sort = one(params.sort) || 'recommended';
  const page=parsePage(params.page);
  const hasExplicitSearch=Object.entries(params).some(([key,value]) => key!=='page' && key!=='since' && (Array.isArray(value)?value.some(Boolean):Boolean(value)));
  const sinceRaw=one(params.since);
  const since=sinceRaw && Number.isFinite(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : '';
  const range = resolveDateRange(dateMode,customStartRaw,customEndRaw);
  const searchAnalyticsTerm=keyword || [
    range.label,
    prefecture,
    category ? categoryLabels[category] : '',
    experience ? (experience==='experience' ? '体験・ものづくり' : EXPERIENCE_LABELS[experience]) : '',
    age ? ageLabels[age] : '',
    fandom ? FANDOM_LABELS[fandom] : '',
    fandomKeyword,
    price ? PRICE_LABELS[price] : '',
    rainyDayOnly ? '雨の日・室内遊び' : indoorOnly ? '室内' : '',
    venueFilterActive && venueTypes.length<VENUE_TYPE_OPTIONS.length ? venueTypes.map((key)=>VENUE_TYPE_LABELS[key]).join(' ') : '',
    childFocusOnly ? '子どもが主役' : familyFriendlyOnly ? 'ファミリー向け' : '',
    accessibilityOnly || accessibilityFeature ? '配慮情報' : ''
  ].filter(Boolean).join(' ');

  const result = await searchEventsPage({
    startDate: range.startDate,endDate: range.endDate,prefecture,keyword,
    excludeTerms: parseExcludeTerms(excludeWords),categories: experience ? [experience] : category ? [category] : undefined,
    ageGroups: age ? [age] : undefined,durationBuckets: duration ? [duration] : undefined,
    fandomSlugs: fandom ? [fandom] : undefined,fandomKeyword:fandomKeyword||undefined,priceTypes: price ? [price] : undefined,
    createdAfter: since || undefined,
    accessibilityOnly: accessibilityOnly || Boolean(accessibilityFeature),
    accessibilityKeys: accessibilityFeature ? [accessibilityFeature] : undefined,
    audienceIntents: childFocusOnly ? ['child_centered'] : (familyFriendlyOnly || rainyDayOnly) ? ['child_centered','family_friendly'] : undefined,
    excludeAdultOriented: excludeAdultOriented || rainyDayOnly,
    indoorOnly: indoorOnly || rainyDayOnly,
    venueTypes,
    venueFilterActive,
    sort: sort === 'start_date' || sort === 'short_first' || sort === 'newest' ? sort : 'recommended'
  },page,24);

  const groupLongRunning = sort === 'recommended' && !duration;
  const regularEvents = groupLongRunning ? result.events.filter((event) => event.duration_days <= 10) : result.events;
  const longRunningEvents = groupLongRunning ? result.events.filter((event) => event.duration_days >= 11) : [];

  const paginationQuery:Record<string,string|string[]|undefined>={
    when:dateMode !== 'today' ? dateMode : undefined,
    from:dateMode==='custom'?range.startDate:undefined,
    to:dateMode==='custom'&&range.endDate!==range.startDate?range.endDate:undefined,
    prefecture:prefecture||undefined,q:keyword||undefined,
    exclude:excludeWords||undefined,category:category||undefined,experience:experience||undefined,age:age||undefined,duration:duration||undefined,
    oshi:fandom||undefined,oshiKeyword:fandomKeyword||undefined,price:price||undefined,accessibility:accessibilityOnly?'1':undefined,
    accessibilityFeature:accessibilityFeature||undefined,childFocus:childFocusOnly?'1':undefined,
    family:familyFriendlyOnly?'1':undefined,rainy:rainyDayOnly?'1':undefined,excludeAdult:excludeAdultOriented?'1':undefined,indoor:indoorOnly?'1':undefined,
    venueFilter:venueFilterActive?'1':undefined,venue:venueFilterActive?venueTypes:undefined,
    sort:sort!=='recommended'?sort:undefined,since:since||undefined
  };

  return (
    <main>
      <VisitTracker />
      {page===1 && hasExplicitSearch && <MetricPing metric="search" searchTerm={searchAnalyticsTerm||undefined} />}
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">MACHI IBE</p>
          <h1>{messages.heroTitleLine1}<br />{messages.heroTitleLine2}</h1>
          <p className="hero-copy">{messages.heroCopy}</p>
          <EventFilters values={{dateMode,customStart:dateMode==='custom'?range.startDate:'',customEnd:dateMode==='custom'&&range.endDate!==range.startDate?range.endDate:'',prefecture,keyword,excludeWords,category,experience,age,duration,fandom,fandomKeyword,price,accessibilityOnly,accessibilityFeature,childFocusOnly,familyFriendlyOnly,rainyDayOnly,excludeAdultOriented,indoorOnly,venueTypes,venueFilterActive,sort}} />
        </div>
      </section>

      <section className="content-wrap">
        <HomePrSlot />
        <FeaturedStories />
        <MachimamoBridge />
        <PickupEvents />
        <div className="result-tools">
          <NewSinceLastVisitLink active={Boolean(since)} />
          <Link href={localePath('/saved',locale)}>{messages.savedList}</Link>
          <Link href={localePath('/saved-searches',locale)}>{messages.savedSearches}</Link>
          <Link href={localePath('/plan',locale)}>{messages.plan}</Link>
        </div>
        <div className="section-heading">
          <div><span className="result-kicker">{since?'前回訪問後の新着':range.label}</span><h2>{prefecture || '全国'}のイベント</h2></div>
          <span className="result-count" aria-live="polite">{locale==='ja'?`${result.events.length}件表示・${result.page}ページ目`:`${result.events.length} ${messages.displayed} · ${messages.page} ${result.page}`}</span>
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
            <Pagination basePath={localePath('/',locale)} page={result.page} hasPrevious={result.hasPrevious} hasNext={result.hasNext} query={paginationQuery} />
          </>
        ) : (
          <div className="empty-state"><div className="empty-icon">◎</div><h2>{messages.noResultsTitle}</h2><p>{messages.noResultsCopy}</p></div>
        )}
        <SeoBrowseLinks />
      </section>
    </main>
  );
}
