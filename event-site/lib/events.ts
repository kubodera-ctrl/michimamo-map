import { getPublicSupabase } from './supabase';
import type { EventDetail, EventPageResult, EventSearchInput, EventSearchResult, EventStatus, EventSummary, LocationPrecision, PriceType, VenueTypeKey } from './types';

type ApprovedEventTranslation = {
  event_id:number;
  locale:'en'|'zh-cn'|'zh-tw'|'ko';
  title:string;
  summary:string|null;
  status_note:string|null;
  venue_name:string|null;
  address_text:string|null;
  price_text:string|null;
  reservation_text:string|null;
  organizer_name:string|null;
  accessibility_notes:string|null;
  translation_source:'manual'|'provider'|'machine_reviewed';
  reviewed_at:string|null;
};

async function getApprovedEventTranslations(eventIds:number[],locale:EventSearchInput['locale']):Promise<Map<number,ApprovedEventTranslation>>{
  if(!locale || locale==='ja' || !eventIds.length) return new Map();
  const db=getPublicSupabase();
  if(!db) return new Map();
  const unique=[...new Set(eventIds)].slice(0,100);
  const {data,error}=await db.rpc('get_public_event_translations',{p_event_ids:unique,p_locale:locale});
  if(error){
    console.error('get_public_event_translations failed',error.message);
    return new Map();
  }
  return new Map((Array.isArray(data)?data:[]).map((row:ApprovedEventTranslation)=>[row.event_id,row]));
}

function overlayTranslation<T extends EventSummary>(event:T,translation:ApprovedEventTranslation|undefined):T{
  if(!translation) return event;
  const localized:any={
    ...event,
    title:translation.title || event.title,
    summary:translation.summary ?? event.summary,
    status_note:translation.status_note ?? event.status_note,
    venue_name:translation.venue_name ?? event.venue_name,
    address:translation.address_text ?? event.address,
    price_text:translation.price_text ?? event.price_text,
    organizer_name:translation.organizer_name ?? event.organizer_name,
    accessibility_notes:translation.accessibility_notes ?? event.accessibility_notes,
    translation_locale:translation.locale,
    translation_source:translation.translation_source
  };
  if('reservation_text' in event){
    localized.reservation_text=translation.reservation_text ?? (event as EventDetail).reservation_text;
  }
  return localized as T;
}

async function localizeEvents<T extends EventSummary>(events:T[],locale:EventSearchInput['locale']):Promise<T[]>{
  if(!locale || locale==='ja' || !events.length) return events;
  const translations=await getApprovedEventTranslations(events.map((event)=>event.id),locale);
  return events.map((event)=>overlayTranslation(event,translations.get(event.id)));
}

export const CATEGORY_OPTIONS = [
  ['family','親子・子ども'],
  ['festival','お祭り'],
  ['fireworks','花火'],
  ['food','グルメ'],
  ['market','マルシェ'],
  ['nature','自然'],
  ['learning','学び'],
  ['experience','体験・ものづくり'],
  ['entertainment','遊び・エンタメ'],
  ['sports','スポーツ'],
  ['art','アート・文化']
] as const;

export const VENUE_TYPE_OPTIONS: ReadonlyArray<readonly [VenueTypeKey,string]> = [
  ['park_plaza','🌳 公園・広場'],
  ['mall','🛍 モール・商業施設'],
  ['event_venue_indoor','🏢 イベント会場（屋内）'],
  ['event_venue_outdoor','🎪 イベント会場（屋外）'],
  ['hotel','🏨 ホテル・宿泊施設'],
  ['amusement','🎡 レジャー・アミューズメント'],
  ['culture_public','🏛 文化・公共施設'],
  ['other','📍 その他']
];

export const VENUE_TYPE_LABELS=Object.fromEntries(VENUE_TYPE_OPTIONS) as Record<VenueTypeKey,string>;

export const EXPERIENCE_OPTIONS = [
  ['experience_gem','宝石・鉱物・化石探し'],
  ['experience_fishing','釣り・魚つかみ'],
  ['experience_glass','ガラス細工'],
  ['experience_ring','指輪・アクセサリー作り'],
  ['experience_pottery','陶芸・焼き物'],
  ['experience_craft','工作・クラフト'],
  ['experience_woodwork','木工・DIY'],
  ['experience_food','料理・お菓子・食品づくり'],
  ['experience_farm','農業・収穫'],
  ['experience_animal','動物ふれあい・飼育'],
  ['experience_science','科学・実験'],
  ['experience_traditional','伝統文化・工芸'],
  ['experience_factory','工場見学・職業体験'],
  ['experience_outdoor','アウトドア・自然体験'],
  ['experience_sports','スポーツ体験'],
  ['experience_other','その他の体験']
] as const;

export const EXPERIENCE_LABELS=Object.fromEntries(EXPERIENCE_OPTIONS) as Record<string,string>;

export const AGE_OPTIONS = [
  ['age_0_2','0〜2歳'],
  ['preschool','未就学'],
  ['elementary','小学生'],
  ['teen','中高生'],
  ['family','親子']
] as const;

export const DURATION_OPTIONS = [
  ['single','1日'],
  ['2_4','2〜4日'],
  ['5_10','5〜10日'],
  ['11_30','11〜30日'],
  ['31_plus','31日以上']
] as const;

export const ACCESSIBILITY_OPTIONS = [
  ['wheelchair','車いす対応'],
  ['accessible_toilet','バリアフリートイレ'],
  ['accessible_parking','優先・障害者用駐車場'],
  ['companion_support','介助者・同伴者対応'],
  ['sign_language','手話対応'],
  ['captions','字幕・文字情報'],
  ['audio_description','音声案内・音声解説'],
  ['sensory_friendly','感覚過敏への配慮'],
  ['assistance_dog','補助犬対応'],
  ['disability_discount','障害者手帳等の割引']
] as const;

export const ACCESSIBILITY_LABELS = Object.fromEntries(ACCESSIBILITY_OPTIONS) as Record<string,string>;

export const FANDOM_GROUPS: ReadonlyArray<{ label: string; items: ReadonlyArray<readonly [string,string]> }> = [
  {
    label: 'キャラクター・ファミリー',
    items: [
      ['chiikawa','ちいかわ'],['pokemon','ポケモン'],['sanrio','サンリオ'],
      ['hello-kitty','ハローキティ'],['kuromi','クロミ'],['cinnamoroll','シナモロール'],
      ['sumikkogurashi','すみっコぐらし'],['moomin','ムーミン'],['odekake-kozame','おでかけ子ザメ'],['doraemon','ドラえもん'],['anpanman','アンパンマン'],
      ['crayon-shinchan','クレヨンしんちゃん'],['miffy','ミッフィー'],
      ['paw-patrol','パウ・パトロール'],['thomas','きかんしゃトーマス'],
      ['sylvanian-families','シルバニアファミリー'],['tamagotchi','たまごっち']
    ]
  },
  {
    label: 'ジャンプ・少年漫画',
    items: [
      ['one-piece','ONE PIECE'],['demon-slayer','鬼滅の刃'],['spy-family','SPY×FAMILY'],
      ['my-hero-academia','僕のヒーローアカデミア'],['haikyu','ハイキュー!!'],
      ['jujutsu-kaisen','呪術廻戦'],['hunter-x-hunter','HUNTER×HUNTER'],
      ['naruto','NARUTO'],['bleach','BLEACH'],['gintama','銀魂'],
      ['prince-of-tennis','テニスの王子様'],['kuroko-basketball','黒子のバスケ'],
      ['world-trigger','ワールドトリガー'],['blue-exorcist','青の祓魔師'],
      ['chainsaw-man','チェンソーマン'],['sakamoto-days','SAKAMOTO DAYS'],['dr-stone','Dr.STONE'],['space-brothers','宇宙兄弟'],['galaxy-express-999','銀河鉄道999']
    ]
  },
  {
    label: 'ゲーム・アニメ・ヒーロー',
    items: [
      ['detective-conan','名探偵コナン'],['aipri','アイプリ'],['precure','プリキュア'],
      ['kamen-rider','仮面ライダー'],['super-sentai','スーパー戦隊'],['ultraman','ウルトラマン'],
      ['super-mario','スーパーマリオ'],['kirby','星のカービィ'],['animal-crossing','どうぶつの森'],
      ['idolmaster-sidem','アイドルマスター SideM'],['touken-ranbu','刀剣乱舞']
    ]
  },
  {
    label: '映画・スタジオ',
    items: [
      ['disney','ディズニー'],['pixar','ピクサー'],['minions','ミニオン'],
      ['ghibli','ジブリ'],['hayao-miyazaki','宮崎駿']
    ]
  },
  {
    label: 'インフルエンサー・クリエイター',
    items: [
      ['shinako','しなこ'],
      ['takeshita-paradise','竹下☆ぱらだいす'],
      ['colorful-peach','カラフルピーチ'],
      ['tiropino','ちろぴの'],
      ['bom-bom-tv','ボンボンTV'],
      ['rocomacoaco','ろこまこあこ'],
      ['quizknock','QuizKnock'],['hololive','ホロライブ']
    ]
  }
] as const;

export const FANDOM_OPTIONS: ReadonlyArray<readonly [string,string]> = FANDOM_GROUPS.flatMap((group) => group.items);
export const FANDOM_LABELS = Object.fromEntries(FANDOM_OPTIONS) as Record<string,string>;

export const PRICE_OPTIONS: ReadonlyArray<readonly [PriceType,string]> = [
  ['free','完全無料'],
  ['partly_free','一部無料'],
  ['paid','有料'],
  ['unknown','料金不明']
];

export const PRICE_LABELS = Object.fromEntries(PRICE_OPTIONS) as Record<PriceType,string>;

export const EVENT_STATUS_LABELS: Record<EventStatus,string> = {
  scheduled:'開催予定',
  changed:'内容変更あり',
  postponed:'延期',
  cancelled:'中止',
  sold_out:'完売',
  registration_closed:'受付終了'
};

export const LOCATION_PRECISION_LABELS: Record<LocationPrecision,string> = {
  exact_venue:'会場位置確認済み',
  exact_address:'住所位置確認済み',
  street:'道路・街区付近',
  approximate:'おおよその位置',
  unknown:'位置精度未確認'
};

export function isTrustedLocation(event: Pick<EventSummary,'latitude'|'longitude'|'location_precision'|'location_verified'>) {
  return event.location_verified
    && event.latitude != null
    && event.longitude != null
    && (event.location_precision === 'exact_venue' || event.location_precision === 'exact_address');
}

export const SORT_OPTIONS = [
  ['recommended','おすすめ（短期・新規開催を優先）'],
  ['start_date','開催日が近い順'],
  ['short_first','開催期間が短い順'],
  ['newest','新着順']
] as const;

export function parseExcludeTerms(value: string): string[] {
  return [...new Set(
    value
      .split(/[、,\n]+/)
      .map((item) => item.trim().slice(0,80))
      .filter(Boolean)
  )].slice(0, 20);
}

export async function searchEventsWithStatus(input: EventSearchInput): Promise<EventSearchResult> {
  const db = getPublicSupabase();
  if (!db) return { events: [], error: 'unconfigured' };

  const priceTypes = input.priceTypes?.length
    ? input.priceTypes
    : input.freeOnly
      ? ['free' as PriceType]
      : null;

  const { data, error } = await db.rpc('search_public_events', {
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_prefecture: input.prefecture || null,
    p_keyword: input.keyword || null,
    p_exclude_terms: input.excludeTerms?.length ? input.excludeTerms : null,
    p_categories: input.categories?.length ? input.categories : null,
    p_age_groups: input.ageGroups?.length ? input.ageGroups : null,
    p_duration_buckets: input.durationBuckets?.length ? input.durationBuckets : null,
    p_accessibility_only: input.accessibilityOnly || false,
    p_accessibility_keys: input.accessibilityKeys?.length ? input.accessibilityKeys : null,
    p_audience_intents: input.audienceIntents?.length ? input.audienceIntents : null,
    p_fandom_slugs: input.fandomSlugs?.length ? input.fandomSlugs : null,
    p_fandom_keyword: input.fandomKeyword || null,
    p_price_types: priceTypes,
    p_created_after: input.createdAfter || null,
    p_exclude_adult_oriented: input.excludeAdultOriented || false,
    p_indoor_only: input.indoorOnly || false,
    p_venue_types: input.venueTypes ?? null,
    p_venue_filter_active: input.venueFilterActive || false,
    p_sort: input.sort || 'recommended',
    p_limit: input.limit ?? 60,
    p_offset: input.offset ?? 0
  });

  if (error) {
    console.error('search_public_events failed', error.message);
    return { events: [], error: 'request_failed' };
  }

  const events=(data ?? []) as EventSummary[];
  return { events: await localizeEvents(events,input.locale), error: null };
}

export async function searchEvents(input: EventSearchInput): Promise<EventSummary[]> {
  return (await searchEventsWithStatus(input)).events;
}

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw || '1', 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1;
}

export async function searchEventsPage(
  input: EventSearchInput,
  page: number,
  pageSize = 24
): Promise<EventPageResult> {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(Math.max(pageSize, 6), 48);
  const result = await searchEventsWithStatus({
    ...input,
    limit: safeSize + 1,
    offset: (safePage - 1) * safeSize
  });
  return {
    events: result.events.slice(0, safeSize),
    error: result.error,
    page: safePage,
    pageSize: safeSize,
    hasPrevious: safePage > 1,
    hasNext: result.events.length > safeSize
  };
}

export async function getEvent(slug: string, locale:EventSearchInput['locale']='ja'): Promise<EventDetail | null> {
  const db = getPublicSupabase();
  if (!db) return null;

  const { data, error } = await db.rpc('get_public_event', { p_slug: slug });
  if (error) {
    console.error('get_public_event failed', error.message);
    return null;
  }
  const event=(data || null) as EventDetail | null;
  if(!event) return null;
  return (await localizeEvents([event],locale))[0] || event;
}

export async function getEventsBySlugs(slugs:string[],locale:EventSearchInput['locale']='ja'): Promise<EventDetail[]> {
  const db=getPublicSupabase();
  if (!db || !slugs.length) return [];
  const unique=[...new Set(slugs)].slice(0,100);
  const {data,error}=await db.rpc('get_public_events_by_slugs',{p_slugs:unique});
  if (error) {
    console.error('get_public_events_by_slugs failed',error.message);
    return [];
  }
  return localizeEvents((Array.isArray(data) ? data : []) as EventDetail[],locale);
}

export async function getPickupEvents(limit=6,locale:EventSearchInput['locale']='ja'): Promise<EventDetail[]> {
  const db=getPublicSupabase();
  if(!db) return [];
  const {data,error}=await db.rpc('get_public_machiibe_pickups',{p_limit:Math.min(Math.max(limit,1),12)});
  if(error){
    console.error('get_public_machiibe_pickups failed',error.message);
    return [];
  }
  return localizeEvents((Array.isArray(data)?data:[]) as EventDetail[],locale);
}

export async function getPublicFacetSitemap(): Promise<Array<{kind:'prefecture'|'category';key:string;updated_at:string;event_count:number}>> {
  const db = getPublicSupabase();
  if (!db) return [];
  const { data, error } = await db.rpc('get_public_facet_sitemap', { p_min_events: 3 });
  if (error) {
    console.error('get_public_facet_sitemap failed', error.message);
    return [];
  }
  return (data ?? []) as Array<{kind:'prefecture'|'category';key:string;updated_at:string;event_count:number}>;
}

export async function getPublicFandomSitemap(): Promise<Array<{slug:string;updated_at:string;event_count:number}>> {
  const db = getPublicSupabase();
  if (!db) return [];
  const { data, error } = await db.rpc('get_public_fandom_sitemap', { p_min_events: 3 });
  if (error) {
    console.error('get_public_fandom_sitemap failed', error.message);
    return [];
  }
  return (data ?? []) as Array<{slug:string;updated_at:string;event_count:number}>;
}

export async function getEventSitemap(): Promise<Array<{slug:string;updated_at:string}>> {
  const db = getPublicSupabase();
  if (!db) return [];
  const { data, error } = await db.rpc('get_public_event_sitemap', { p_limit: 50000 });
  if (error) {
    console.error('get_public_event_sitemap failed', error.message);
    return [];
  }
  return (data ?? []) as Array<{slug:string;updated_at:string}>;
}

export function japanToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const pick = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function addDays(date: string, days: number): string {
  const [y,m,d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function validIsoDate(value:string|undefined) {
  const text=(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const [y,m,d]=text.split('-').map(Number);
  const probe=new Date(Date.UTC(y,m-1,d));
  return Number.isFinite(probe.getTime()) && probe.toISOString().slice(0,10)===text ? text : '';
}

export function resolveDateRange(
  mode: string | undefined,
  customStart?: string,
  customEnd?: string
): {startDate:string;endDate:string;label:string} {
  const today = japanToday();
  if (mode === 'custom') {
    const rawStart=validIsoDate(customStart);
    const rawEnd=validIsoDate(customEnd);
    const first=rawStart || rawEnd || today;
    const second=rawEnd || first;
    const start=first<=second ? first : second;
    const requestedEnd=first<=second ? second : first;
    const maxEnd=addDays(start,399);
    const end=requestedEnd>maxEnd ? maxEnd : requestedEnd;
    return {startDate:start,endDate:end,label:formatEventDate(start,end)};
  }
  if (mode === 'tomorrow') {
    const tomorrow = addDays(today, 1);
    return { startDate: tomorrow, endDate: tomorrow, label: '明日' };
  }
  if (mode === 'weekend') {
    const [y,m,d] = today.split('-').map(Number);
    const weekday = new Date(Date.UTC(y,m-1,d)).getUTCDay();
    const toSat = weekday === 6 ? 0 : weekday === 0 ? 0 : 6 - weekday;
    const start = addDays(today, toSat);
    const end = weekday === 0 ? today : addDays(start, 1);
    return { startDate: start, endDate: end, label: '今週末' };
  }
  if (mode === '30days') {
    return { startDate: today, endDate: addDays(today, 29), label: '30日以内' };
  }
  return { startDate: today, endDate: today, label: '今日' };
}

export function formatEventDate(start: string, end: string): string {
  const fmt = (value: string) => {
    const [y,m,d] = value.split('-').map(Number);
    return `${y}年${m}月${d}日`;
  };
  return start === end ? fmt(start) : `${fmt(start)} 〜 ${fmt(end)}`;
}

export function formatDuration(days: number): string {
  if (days <= 1) return '1日開催';
  return `${days}日間`;
}
