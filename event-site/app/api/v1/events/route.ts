import {NextResponse} from 'next/server';
import {
  addDays,
  japanToday,
  parseExcludeTerms,
  searchEventsPage
} from '@/lib/events';
import {normalizeLocale} from '@/lib/i18n-config';
import type {PriceType,VenueTypeKey} from '@/lib/types';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const prices=new Set<PriceType>(['free','partly_free','paid','unknown']);
const venues=new Set<VenueTypeKey>([
  'park_plaza','mall','event_venue_indoor','event_venue_outdoor',
  'hotel','amusement','culture_public','other'
]);

function boundedInt(value:string|null,fallback:number,min:number,max:number){
  const parsed=Number.parseInt(value||'',10);
  return Number.isFinite(parsed)?Math.min(Math.max(parsed,min),max):fallback;
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const today=japanToday();
  const rawStart=url.searchParams.get('from')||today;
  const start=isoDate.test(rawStart)?rawStart:today;
  const requestedEnd=url.searchParams.get('to')||addDays(start,29);
  const maxEnd=addDays(start,399);
  const end=isoDate.test(requestedEnd)
    ? (requestedEnd<start?start:requestedEnd>maxEnd?maxEnd:requestedEnd)
    : addDays(start,29);

  const priceRaw=url.searchParams.getAll('price').filter((value):value is PriceType=>prices.has(value as PriceType));
  const venueRaw=url.searchParams.getAll('venue').filter((value):value is VenueTypeKey=>venues.has(value as VenueTypeKey));
  const page=boundedInt(url.searchParams.get('page'),1,1,1000);
  const pageSize=boundedInt(url.searchParams.get('limit'),24,6,48);
  const locale=normalizeLocale(url.searchParams.get('lang'));
  const sortRaw=url.searchParams.get('sort');
  const sort=sortRaw==='start_date'||sortRaw==='short_first'||sortRaw==='newest'?sortRaw:'recommended';

  const result=await searchEventsPage({
    startDate:start,
    endDate:end,
    prefecture:(url.searchParams.get('prefecture')||'').slice(0,20)||undefined,
    keyword:(url.searchParams.get('q')||'').trim().slice(0,100)||undefined,
    excludeTerms:parseExcludeTerms((url.searchParams.get('exclude')||'').slice(0,500)),
    categories:url.searchParams.getAll('category').filter(Boolean).slice(0,20),
    ageGroups:url.searchParams.getAll('age').filter(Boolean).slice(0,20),
    durationBuckets:url.searchParams.getAll('duration').filter(Boolean).slice(0,10),
    accessibilityOnly:url.searchParams.get('accessibility')==='1',
    accessibilityKeys:url.searchParams.getAll('accessibilityFeature').filter(Boolean).slice(0,20),
    audienceIntents:url.searchParams.get('childFocus')==='1'
      ? ['child_centered']
      : url.searchParams.get('family')==='1'
        ? ['child_centered','family_friendly']
        : undefined,
    fandomSlugs:url.searchParams.getAll('oshi').filter(Boolean).slice(0,20),
    fandomKeyword:(url.searchParams.get('oshiKeyword')||'').trim().slice(0,80)||undefined,
    priceTypes:priceRaw,
    excludeAdultOriented:url.searchParams.get('excludeAdult')==='1',
    indoorOnly:url.searchParams.get('indoor')==='1'||url.searchParams.get('rainy')==='1',
    venueTypes:venueRaw,
    venueFilterActive:url.searchParams.get('venueFilter')==='1',
    sort,
    locale
  },page,pageSize);

  if(result.error){
    return NextResponse.json({
      error:{code:result.error,message:'Event data is temporarily unavailable.'},
      meta:{apiVersion:'v1',requestId:request.headers.get('cf-ray')||null}
    },{status:503,headers:{'Cache-Control':'no-store'}});
  }

  return NextResponse.json({
    data:result.events,
    meta:{
      apiVersion:'v1',
      locale,
      from:start,
      to:end,
      page:result.page,
      pageSize:result.pageSize,
      hasPrevious:result.hasPrevious,
      hasNext:result.hasNext
    }
  },{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=300'}});
}
