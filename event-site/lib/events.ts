import { getPublicSupabase } from './supabase';
import type { EventDetail, EventPageResult, EventSearchInput, EventSearchResult, EventStatus, EventSummary, LocationPrecision, PriceType } from './types';

export const CATEGORY_OPTIONS = [
  ['family','親子・子ども'],
  ['festival','お祭り'],
  ['fireworks','花火'],
  ['food','グルメ'],
  ['market','マルシェ'],
  ['nature','自然'],
  ['learning','学び・体験'],
  ['entertainment','遊び・エンタメ'],
  ['sports','スポーツ'],
  ['art','アート・文化']
] as const;

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
      ['sumikkogurashi','すみっコぐらし'],['doraemon','ドラえもん'],['anpanman','アンパンマン'],
      ['crayon-shinchan','クレヨンしんちゃん'],['miffy','ミッフィー'],
      ['paw-patrol','パウ・パトロール'],['thomas','きかんしゃトーマス'],
      ['sylvanian-families','シルバニアファミリー'],['tamagotchi','たまごっち']
    ]
  },
  {
    label: 'ゲーム・アニメ・ヒーロー',
    items: [
      ['detective-conan','名探偵コナン'],['aipri','アイプリ'],['precure','プリキュア'],
      ['kamen-rider','仮面ライダー'],['super-sentai','スーパー戦隊'],['ultraman','ウルトラマン'],
      ['super-mario','スーパーマリオ'],['kirby','星のカービィ'],['animal-crossing','どうぶつの森'],
      ['one-piece','ONE PIECE'],['demon-slayer','鬼滅の刃'],['spy-family','SPY×FAMILY']
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
      ['rocomacoaco','ろこまこあこ']
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
      .map((item) => item.trim())
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
    p_price_types: priceTypes,
    p_updated_after: input.updatedAfter || null,
    p_exclude_adult_oriented: input.excludeAdultOriented || false,
    p_indoor_only: input.indoorOnly || false,
    p_sort: input.sort || 'recommended',
    p_limit: input.limit ?? 60,
    p_offset: input.offset ?? 0
  });

  if (error) {
    console.error('search_public_events failed', error.message);
    return { events: [], error: 'request_failed' };
  }

  return { events: (data ?? []) as EventSummary[], error: null };
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

export async function getEvent(slug: string): Promise<EventDetail | null> {
  const db = getPublicSupabase();
  if (!db) return null;

  const { data, error } = await db.rpc('get_public_event', { p_slug: slug });
  if (error) {
    console.error('get_public_event failed', error.message);
    return null;
  }
  return (data || null) as EventDetail | null;
}

export async function getEventsBySlugs(slugs:string[]): Promise<EventSummary[]> {
  const db=getPublicSupabase();
  if (!db || !slugs.length) return [];
  const unique=[...new Set(slugs)].slice(0,100);
  const {data,error}=await db.rpc('get_public_events_by_slugs',{p_slugs:unique});
  if (error) {
    console.error('get_public_events_by_slugs failed',error.message);
    return [];
  }
  return (Array.isArray(data) ? data : []) as EventSummary[];
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

export function resolveDateRange(mode: string | undefined): {startDate:string;endDate:string;label:string} {
  const today = japanToday();
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
    return { startDate: today, endDate: addDays(today, 30), label: '30日以内' };
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
