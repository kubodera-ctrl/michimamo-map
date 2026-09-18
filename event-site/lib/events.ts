import { getPublicSupabase } from './supabase';
import type { EventDetail, EventSearchInput, EventSummary } from './types';

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

export async function searchEvents(input: EventSearchInput): Promise<EventSummary[]> {
  const db = getPublicSupabase();
  if (!db) return [];

  const { data, error } = await db.rpc('search_public_events', {
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_prefecture: input.prefecture || null,
    p_keyword: input.keyword || null,
    p_categories: input.categories?.length ? input.categories : null,
    p_age_groups: input.ageGroups?.length ? input.ageGroups : null,
    p_free_only: input.freeOnly || false,
    p_indoor_only: input.indoorOnly || false,
    p_limit: input.limit ?? 60,
    p_offset: input.offset ?? 0
  });

  if (error) {
    console.error('search_public_events failed', error.message);
    return [];
  }

  return (data ?? []) as EventSummary[];
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
