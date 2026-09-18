import { addDays, expandPartyFilter, japanToday, searchEvents } from './events';
import type { EventSummary } from './types';

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
  party?: string;
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
  },
  'today-couple': {
    title: '今日のカップル向けイベント｜デート・おでかけ',
    heading: '今日、カップルで楽しみやすいイベント',
    description: '今日開催されるイベントの中から、カップル・夫婦・二人で楽しみやすいと確認できたおでかけ候補を探せます。',
    day: 'today', region: null, indoorOnly: false, party: 'couple'
  },
  'tomorrow-couple': {
    title: '明日のカップル向けイベント｜デート・おでかけ',
    heading: '明日、カップルで楽しみやすいイベント',
    description: '明日開催されるイベントの中から、カップル・夫婦・二人で楽しみやすいと確認できたおでかけ候補を探せます。',
    day: 'tomorrow', region: null, indoorOnly: false, party: 'couple'
  },
  'today-solo': {
    title: '今日のひとりイベント｜1人・おひとりさま・男性一人・女性一人のおでかけ',
    heading: '今日、1人で参加しやすいイベント',
    description: '今日開催されるイベントから、1人・ひとり・おひとりさま、男性一人・女性一人でも参加しやすいと確認できた候補を探せます。',
    day: 'today', region: null, indoorOnly: false, party: 'solo'
  },
  'tomorrow-solo': {
    title: '明日のひとりイベント｜1人・おひとりさま・男性一人・女性一人のおでかけ',
    heading: '明日、1人で参加しやすいイベント',
    description: '明日開催されるイベントから、1人・ひとり・おひとりさま、男性一人・女性一人でも参加しやすいと確認できた候補を探せます。',
    day: 'tomorrow', region: null, indoorOnly: false, party: 'solo'
  },
  'today-senior': {
    title: '今日のシニア向けイベント｜年配・夫婦のおでかけ',
    heading: '今日、シニア・年配の方が楽しみやすいイベント',
    description: '今日開催されるイベントから、シニア・年配の方が楽しみやすいと確認できたおでかけ候補を探せます。',
    day: 'today', region: null, indoorOnly: false, party: 'senior'
  }
};

export type SeoIntentKey = keyof typeof SEO_INTENTS;

function targetDate(day: 'today' | 'tomorrow') {
  const today = japanToday();
  return day === 'tomorrow' ? addDays(today, 1) : today;
}

export async function searchSeoIntentEvents(intentKey: SeoIntentKey): Promise<EventSummary[]> {
  const intent = SEO_INTENTS[intentKey];
  const date = targetDate(intent.day);
  const common = {
    startDate: date,
    endDate: date,
    ageGroups: intent.familyOnly ? ['family'] : undefined,
    partyKeys: expandPartyFilter(intent.party),
    indoorOnly: intent.indoorOnly,
    sort: 'recommended' as const,
    limit: 60
  };

  if (intent.region) {
    const prefectures = REGION_PREFECTURES[intent.region];
    const chunks = await Promise.all(prefectures.map((prefecture) => searchEvents({ ...common, prefecture })));
    const byId = new Map<number, EventSummary>();
    for (const event of chunks.flat()) byId.set(event.id, event);
    return [...byId.values()]
      .sort((a,b) => a.duration_days - b.duration_days || a.start_date.localeCompare(b.start_date) || a.title.localeCompare(b.title))
      .slice(0,60);
  }

  return searchEvents(common);
}
