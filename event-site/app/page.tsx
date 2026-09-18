import { EventCard } from '@/components/EventCard';
import { EventFilters } from '@/components/EventFilters';
import { resolveDateRange, searchEvents } from '@/lib/events';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const dateMode = one(params.when) || 'today';
  const prefecture = one(params.prefecture);
  const keyword = one(params.q);
  const category = one(params.category);
  const age = one(params.age);
  const freeOnly = one(params.free) === '1';
  const indoorOnly = one(params.indoor) === '1';
  const range = resolveDateRange(dateMode);

  const events = await searchEvents({
    startDate: range.startDate,
    endDate: range.endDate,
    prefecture,
    keyword,
    categories: category ? [category] : undefined,
    ageGroups: age ? [age] : undefined,
    freeOnly,
    indoorOnly,
    limit: 60
  });

  return (
    <main>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow">MACHIMAMO EVENTS</p>
          <h1>今日、どこ行く？<br />全国のイベントをひとつに。</h1>
          <p className="hero-copy">地域の小さなお祭りから大型イベントまで。日付・場所・家族向け条件から探して、現地の安全情報はまちまもMAPへ。</p>
          <EventFilters values={{ dateMode, prefecture, keyword, category, age, freeOnly, indoorOnly }} />
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
          <div className="event-grid">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <h2>条件に合う公開イベントはまだありません</h2>
            <p>データ未投入の開発環境でもこの表示で正常です。E0では出典・利用条件を確認できたイベントだけを順次公開します。</p>
          </div>
        )}
      </section>
    </main>
  );
}
