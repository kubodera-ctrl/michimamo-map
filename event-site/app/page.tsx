import { EventCard } from '@/components/EventCard';
import { EventFilters } from '@/components/EventFilters';
import { parseExcludeTerms, resolveDateRange, searchEvents } from '@/lib/events';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const dateMode = one(params.when) || 'today';
  const prefecture = one(params.prefecture);
  const keyword = one(params.q);
  const excludeWords = one(params.exclude);
  const category = one(params.category);
  const age = one(params.age);
  const duration = one(params.duration);
  const accessibilityOnly = one(params.accessibility) === '1';
  const accessibilityFeature = one(params.accessibilityFeature);
  const childFocusOnly = one(params.childFocus) === '1';
  const excludeAdultOriented = one(params.excludeAdult) === '1';
  const freeOnly = one(params.free) === '1';
  const indoorOnly = one(params.indoor) === '1';
  const sort = one(params.sort) || 'recommended';
  const range = resolveDateRange(dateMode);

  const events = await searchEvents({
    startDate: range.startDate,
    endDate: range.endDate,
    prefecture,
    keyword,
    excludeTerms: parseExcludeTerms(excludeWords),
    categories: category ? [category] : undefined,
    ageGroups: age ? [age] : undefined,
    durationBuckets: duration ? [duration] : undefined,
    accessibilityOnly: accessibilityOnly || Boolean(accessibilityFeature),
    accessibilityKeys: accessibilityFeature ? [accessibilityFeature] : undefined,
    audienceIntents: childFocusOnly ? ['child_centered'] : undefined,
    excludeAdultOriented,
    freeOnly,
    indoorOnly,
    sort: sort === 'start_date' || sort === 'short_first' || sort === 'newest' ? sort : 'recommended',
    limit: 60
  });

  const groupLongRunning = sort === 'recommended' && !duration;
  const regularEvents = groupLongRunning ? events.filter((event) => event.duration_days <= 10) : events;
  const longRunningEvents = groupLongRunning ? events.filter((event) => event.duration_days >= 11) : [];

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">MACHIMAMO EVENTS</p>
          <h1>今日、どこ行く？<br />全国のイベントをひとつに。</h1>
          <p className="hero-copy">地域の小さなお祭りから大型イベントまで。見たいものを残し、見たくないものは除外できるイベント検索を目指します。</p>
          <EventFilters values={{
            dateMode,
            prefecture,
            keyword,
            excludeWords,
            category,
            age,
            duration,
            accessibilityOnly,
            accessibilityFeature,
            childFocusOnly,
            excludeAdultOriented,
            freeOnly,
            indoorOnly,
            sort
          }} />
        </div>
      </section>

      <section className="content-wrap">
        <div className="section-heading">
          <div>
            <span className="result-kicker">{range.label}</span>
            <h2>{prefecture || '全国'}のイベント</h2>
          </div>
          <span className="result-count">{events.length}件表示</span>
        </div>

        {events.length ? (
          <>
            {regularEvents.length > 0 && (
              <div className="event-grid">
                {regularEvents.map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            )}

            {longRunningEvents.length > 0 && (
              <details className="long-running-group">
                <summary>
                  <span>
                    <strong>長期開催のイベント</strong>
                    <small>11日以上のイベントは、繰り返し検索の邪魔になりにくいよう分けて表示します。</small>
                  </span>
                  <b>{longRunningEvents.length}件</b>
                </summary>
                <div className="event-grid long-running-grid">
                  {longRunningEvents.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <h2>条件に合う公開イベントはまだありません</h2>
            <p>条件を少し緩めるか、除外ワード・開催期間を見直してください。E0では出典と利用条件を確認できたイベントだけを順次公開します。</p>
          </div>
        )}
      </section>
    </main>
  );
}
