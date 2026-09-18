import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { CATEGORY_OPTIONS, addDays, japanToday, searchEvents } from '@/lib/events';
import { PREFECTURES, prefectureBySlug } from '@/lib/prefectures';
import { breadcrumbJsonLd, siteUrl } from '@/lib/seo';

export function generateStaticParams() {
  return PREFECTURES.map(([prefecture]) => ({ prefecture }));
}

export async function generateMetadata({ params }: { params: Promise<{prefecture:string}> }): Promise<Metadata> {
  const { prefecture } = await params;
  const name = prefectureBySlug[prefecture];
  if (!name) return {};
  const title = `${name}のイベント｜今日・今週末・子ども向けのおでかけ`;
  const description = `${name}の今日・今週末・30日以内のイベントを検索。子ども向け、無料、屋内、障害者向け配慮などの条件にも対応。`;
  return {
    title,
    description,
    alternates: { canonical: `/area/${prefecture}` },
    openGraph: { title, description, url: `/area/${prefecture}`, type: 'website' }
  };
}

export default async function PrefecturePage({ params }: { params: Promise<{prefecture:string}> }) {
  const { prefecture } = await params;
  const name = prefectureBySlug[prefecture];
  if (!name) notFound();

  const today = japanToday();
  const events = await searchEvents({ startDate: today, endDate: addDays(today,30), prefecture: name, limit: 60 });
  const breadcrumb = breadcrumbJsonLd([
    { name: 'まちイベ', path: '/' },
    { name: name, path: `/area/${prefecture}` }
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>{name}</span>
      </nav>
      <p className="eyebrow">AREA</p>
      <h1>{name}のイベント</h1>
      <p className="area-copy">今日から30日以内の公開・確認済みイベントを表示しています。開催内容は公式情報もあわせてご確認ください。</p>

      {events.length ? (
        <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
      ) : (
        <div className="empty-state"><h2>現在表示できるイベントはありません</h2><p>情報源の確認が完了した地域から順次追加します。</p></div>
      )}

      <section className="area-category-links">
        <h2>{name}のイベントをカテゴリから探す</h2>
        <div className="seo-link-grid">
          {CATEGORY_OPTIONS.map(([key,label]) => (
            <Link key={key} href={`/category/${key}?prefecture=${encodeURIComponent(name)}`}>{label}</Link>
          ))}
        </div>
        <p className="seo-note">カテゴリ×地域の検索URLは検索結果ページとして扱い、重複ページの大量インデックスは作りません。</p>
      </section>
    </main>
  );
}
