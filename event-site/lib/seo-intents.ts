import { addDays, japanToday, searchEventsPage, searchEventsWithStatus } from './events';
import type { EventPageResult, EventSummary } from './types';

export const REGION_PREFECTURES = {
  kanto: ['東京都','神奈川県','千葉県','埼玉県','茨城県','栃木県','群馬県']
} as const;

type IntentConfig = {
  title: string;
  heading: string;
  description: string;
  day: 'today' | 'tomorrow';
  region: keyof typeof REGION_PREFECTURES | null;
  indoorOnly: boolean;
  familyOnly?: boolean;
};

export const SEO_INTENTS: Record<string, IntentConfig> = {
  'today-kanto-family': {
    title: '今日の関東イベント｜子連れ・親子で楽しめるおでかけ',
    heading: '今日、関東で子連れで楽しめるイベント',
    description: '今日開催される関東の子連れ・親子向けイベントを探せます。東京・神奈川・千葉・埼玉・茨城・栃木・群馬を対象に、短期開催を見つけやすく表示します。',
    day: 'today', region: 'kanto', indoorOnly: false, familyOnly: true
  },
  'tomorrow-kanto-family': {
    title: '明日の関東イベント｜子連れ・親子で楽しめるおでかけ',
    heading: '明日、関東で子連れで楽しめるイベント',
    description: '明日開催される関東の子連れ・親子向けイベントを探せます。東京・神奈川・千葉・埼玉・茨城・栃木・群馬のおでかけ候補をまとめます。',
    day: 'tomorrow', region: 'kanto', indoorOnly: false, familyOnly: true
  },
  'today-indoor-family': {
    title: '今日の室内イベント｜子連れで楽しめる全国のおでかけ',
    heading: '今日、子連れで楽しめる室内イベント',
    description: '今日開催される全国の室内・屋内イベントを子連れ・親子向け中心に探せます。雨の日や暑い日のおでかけ候補にも。',
    day: 'today', region: null, indoorOnly: true, familyOnly: true
  },
  'tomorrow-indoor-family': {
    title: '明日の室内イベント｜子連れで楽しめる全国のおでかけ',
    heading: '明日、子連れで楽しめる室内イベント',
    description: '明日開催される全国の室内・屋内イベントを子連れ・親子向け中心に探せます。天候に左右されにくいおでかけ候補を探せます。',
    day: 'tomorrow', region: null, indoorOnly: true, familyOnly: true
  }
};

export type SeoIntentKey = keyof typeof SEO_INTENTS;

function targetDate(day: 'today' | 'tomorrow') {
  const today = japanToday();
  return day === 'tomorrow' ? addDays(today, 1) : today;
}

function sortCombined(events:EventSummary[]) {
  return events.sort((a,b) =>
    (a.event_status === 'scheduled' ? 0 : 1) - (b.event_status === 'scheduled' ? 0 : 1)
    || a.duration_days - b.duration_days
    || a.start_date.localeCompare(b.start_date)
    || a.title.localeCompare(b.title)
  );
}

export async function searchSeoIntentEvents(
  intentKey: SeoIntentKey | string,
  page = 1,
  pageSize = 24
): Promise<EventPageResult> {
  const intent = SEO_INTENTS[intentKey];
  if (!intent) return {events:[],error:null,page:1,pageSize,hasPrevious:false,hasNext:false};

  const date = targetDate(intent.day);
  const common = {
    startDate: date,
    endDate: date,
    ageGroups: intent.familyOnly ? ['family'] : undefined,
    indoorOnly: intent.indoorOnly,
    sort: 'recommended' as const
  };

  if (!intent.region) {
    return searchEventsPage(common,page,pageSize);
  }

  const prefectures = REGION_PREFECTURES[intent.region];
  const chunks = await Promise.all(prefectures.map((prefecture) =>
    searchEventsWithStatus({ ...common, prefecture, limit:100, offset:0 })
  ));
  const anyData=chunks.some((chunk)=>chunk.events.length>0);
  const allFailed=chunks.every((chunk)=>Boolean(chunk.error));
  if (allFailed && !anyData) {
    return {events:[],error:'request_failed',page,pageSize,hasPrevious:page>1,hasNext:false};
  }

  const byId = new Map<number, EventSummary>();
  for (const event of chunks.flatMap((chunk)=>chunk.events)) byId.set(event.id,event);
  const sorted=sortCombined([...byId.values()]);
  const start=(Math.max(page,1)-1)*pageSize;
  const slice=sorted.slice(start,start+pageSize+1);
  return {
    events:slice.slice(0,pageSize),
    error:null,
    page:Math.max(page,1),
    pageSize,
    hasPrevious:page>1,
    hasNext:slice.length>pageSize
  };
}
