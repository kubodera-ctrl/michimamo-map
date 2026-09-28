import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {EventFilters} from '@/components/EventFilters';
import {EventCard} from '@/components/EventCard';
import {Pagination} from '@/components/Pagination';
import {
  FANDOM_LABELS,VENUE_TYPE_OPTIONS,parseExcludeTerms,parsePage,resolveDateRange,japanToday
} from '@/lib/events';
import {buildQaEvents,searchQaEvents} from '@/lib/machiibe-search-qa-data';
import type {PriceType,VenueTypeKey} from '@/lib/types';

export const metadata:Metadata={title:'まちイベ 検索UX QA',robots:{index:false,follow:false}};
type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';
const many=(v:string|string[]|undefined)=>Array.isArray(v)?v.filter(Boolean):v?[v]:[];

function returnPath(params:Record<string,string|string[]|undefined>){
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(params)){
    if(value===undefined)continue;
    if(Array.isArray(value))value.forEach((item)=>{if(item)query.append(key,item);});
    else if(value)query.set(key,value);
  }
  const q=query.toString();
  return '/preview/search-qa'+(q?'?'+q:'');
}

export default async function SearchQaPage({searchParams}:{searchParams:SearchParams}){
  if(process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true')notFound();
  const params=await searchParams;
  const fromRaw=one(params.from).slice(0,10);
  const toRaw=one(params.to).slice(0,10);
  const dateMode=one(params.when)||(fromRaw||toRaw?'custom':'today');
  const range=resolveDateRange(dateMode,fromRaw,toRaw);
  const prefecture=one(params.prefecture);
  const municipality=one(params.municipality).trim().slice(0,40);
  const keyword=one(params.q).trim().slice(0,100);
  const excludeWords=one(params.exclude).slice(0,500);
  const category=one(params.category);
  const experience=one(params.experience);
  const age=one(params.age);
  const duration=one(params.duration);
  const fandom=one(params.oshi);
  const fandomKeyword=one(params.oshiKeyword).trim().slice(0,80);
  const price=one(params.price) as PriceType|'';
  const accessibilityOnly=one(params.accessibility)==='1';
  const accessibilityFeature=one(params.accessibilityFeature);
  const childFocusOnly=one(params.childFocus)==='1';
  const familyFriendlyOnly=one(params.family)==='1';
  const rainyDayOnly=one(params.rainy)==='1';
  const excludeAdultOriented=one(params.excludeAdult)==='1';
  const indoorOnly=one(params.indoor)==='1';
  const venueFilterActive=one(params.venueFilter)==='1';
  const allowedVenues=new Set<VenueTypeKey>(VENUE_TYPE_OPTIONS.map(([key])=>key));
  const venueTypes=many(params.venue).filter((v):v is VenueTypeKey=>allowedVenues.has(v as VenueTypeKey));
  const sort=one(params.sort)||'recommended';
  const page=parsePage(params.page);

  const anchor=japanToday();
  const events=buildQaEvents(anchor);
  const categories=experience?[experience]:category?[category]:undefined;
  const filtered=searchQaEvents(events,{
    startDate:range.startDate,endDate:range.endDate,prefecture:prefecture||undefined,municipality:municipality||undefined,
    keyword:keyword||undefined,excludeTerms:parseExcludeTerms(excludeWords),categories,ageGroups:age?[age]:undefined,
    durationBuckets:duration?[duration]:undefined,accessibilityOnly:accessibilityOnly||Boolean(accessibilityFeature),
    accessibilityKeys:accessibilityFeature?[accessibilityFeature]:undefined,
    audienceIntents:childFocusOnly?['child_centered']:(familyFriendlyOnly||rainyDayOnly)?['child_centered','family_friendly']:undefined,
    fandomSlugs:fandom?[fandom]:undefined,fandomKeyword:fandomKeyword||undefined,
    priceTypes:price?[price]:undefined,excludeAdultOriented:excludeAdultOriented||rainyDayOnly,indoorOnly:indoorOnly||rainyDayOnly,
    venueTypes,venueFilterActive,sort:sort==='start_date'||sort==='short_first'||sort==='newest'?sort:'recommended'
  });
  const pageSize=12;
  const pageStart=(page-1)*pageSize;
  const visible=filtered.slice(pageStart,pageStart+pageSize);
  const back=returnPath(params);

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">PREVIEW ONLY / READ-ONLY QA</p>
          <h1>まちイベ<br/>イベント検索UX QA</h1>
          <p className="hero-copy">CI verified factual fixture + synthetic coverage。全件 fixtureOnly=true で、Production・SNS・ASP・SEO対象外です。</p>
          <EventFilters actionPath="/preview/search-qa" showSaveSearch={false} values={{
            dateMode,customStart:dateMode==='custom'?range.startDate:'',customEnd:dateMode==='custom'&&range.endDate!==range.startDate?range.endDate:'',
            prefecture,municipality,keyword,excludeWords,category,experience,age,duration,fandom,fandomKeyword,price,
            accessibilityOnly,accessibilityFeature,childFocusOnly,familyFriendlyOnly,rainyDayOnly,excludeAdultOriented,
            indoorOnly,venueTypes,venueFilterActive,sort
          }}/>
        </div>
      </section>
      <section className="content-wrap">
        <div className="admin-warning">QA専用データです。verified factual snapshot {events.filter((e)=>e.qaKind==='verified_ci').length}件 / synthetic {events.filter((e)=>e.qaKind==='synthetic').length}件。syntheticは検索条件網羅用で実イベントではありません。</div>
        <div className="section-heading">
          <div><span className="result-kicker">{range.label}</span><h2>{prefecture||'全国'}{municipality?' '+municipality:''}のQA結果</h2></div>
          <span className="result-count" aria-live="polite">{filtered.length}件 / {page}ページ目</span>
        </div>
        {filtered.length?(
          <>
            <div className="event-grid">
              {visible.map((event)=><EventCard key={event.slug} event={event} respectHidden={false} detailBasePath="/preview/search-qa/events" returnTo={back} qaLabel={event.qaKind==='verified_ci'?'VERIFIED QA':'SYNTHETIC QA'} />)}
            </div>
            <Pagination basePath="/preview/search-qa" page={page} hasPrevious={page>1} hasNext={pageStart+pageSize<filtered.length} query={params} />
          </>
        ):(
          <div className="empty-state"><div className="empty-icon">◎</div><h2>この条件では0件です</h2><p>条件を1〜2個外すか、「条件をクリア」で戻してください。通信失敗ではなく検索結果0件です。</p></div>
        )}
        {fandom&&<p className="seo-note">推し活QA: {FANDOM_LABELS[fandom]||fandom}</p>}
      </section>
    </main>
  );
}
