import { notFound } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { addDays, japanToday, searchEvents } from '@/lib/events';
import { PREFECTURES, prefectureBySlug } from '@/lib/prefectures';

export function generateStaticParams() {
  return PREFECTURES.map(([prefecture]) => ({ prefecture }));
}

export async function generateMetadata({ params }: { params: Promise<{prefecture:string}> }) {
  const { prefecture } = await params;
  const name = prefectureBySlug[prefecture];
  if (!name) return {};
  return {
    title: `${name}のイベント｜今日・今週末のおでかけ`,
    description: `${name}の今日・今週末・30日以内のイベントを探せます。子ども向け、無料、屋内などの条件にも対応。`
  };
}

export default async function PrefecturePage({ params }: { params: Promise<{prefecture:string}> }) {
  const { prefecture } = await params;
  const name = prefectureBySlug[prefecture];
  if (!name) notFound();

  const today = japanToday();
  const events = await searchEvents({ startDate: today, endDate: addDays(today,30), prefecture: name, limit: 60 });

  return (
    <main className="content-wrap area-page">
      <p className="eyebrow">AREA</p>
      <h1>{name}のイベント</h1>
      <p className="area-copy">今日から30日以内に開催される公開・確認済みイベントを表示しています。</p>
      {events.length ? (
        <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
      ) : (
        <div className="empty-state"><h2>現在表示できるイベントはありません</h2><p>情報源の確認が完了した地域から順次追加します。</p></div>
      )}
    </main>
  );
}
