import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { EventCard } from '@/components/EventCard';
import { Pagination } from '@/components/Pagination';
import { CATEGORY_OPTIONS, addDays, japanToday, parsePage, searchEvents, searchEventsPage } from '@/lib/events';
import { breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 3600;

const categoryLabels = Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;
type SearchParams=Promise<Record<string,string|string[]|undefined>>;

export function generateStaticParams() {
  return CATEGORY_OPTIONS.map(([category]) => ({ category }));
}

export async function generateMetadata({
  params,searchParams
}: {
  params: Promise<{category:string}>;
  searchParams:SearchParams;
}): Promise<Metadata> {
  const { category } = await params;
  const query = await searchParams;
  const label = categoryLabels[category];
  if (!label) return {};
  const prefectureValue=query.prefecture;
  const prefecture=Array.isArray(prefectureValue)?prefectureValue[0]||'':prefectureValue||'';
  const page=parsePage(query.page);
  const hasQuery = Object.entries(query).some(([key,value]) => key!=='page' && (Array.isArray(value)?value.some(Boolean):Boolean(value)));
  const today=japanToday();
  const sample=await searchEvents({startDate:today,endDate:addDays(today,29),prefecture,categories:[category],limit:3});
  const allowIndexing=process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true' && Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  const title = `${label}のイベント｜全国の今日・今週末のおでかけ`;
  const description = `全国の${label}イベントを今日から30日以内で検索。開催日、地域、子ども向け、無料、屋内などの条件から探せます。`;
  return {
    title,description,
    alternates: { canonical: `/category/${category}` },
    robots: allowIndexing && !hasQuery && page===1 && sample.length>=3 ? { index: true, follow: true } : { index: false, follow: allowIndexing },
    openGraph: { title, description, url: `/category/${category}`, type: 'website' }
  };
}

export default async function CategoryPage({
  params,searchParams
}: {
  params: Promise<{category:string}>;
  searchParams:SearchParams;
}) {
  const { category } = await params;
  const query = await searchParams;
  const label = categoryLabels[category];
  if (!label) notFound();

  const prefectureValue = query.prefecture;
  const prefecture = Array.isArray(prefectureValue) ? prefectureValue[0] || '' : prefectureValue || '';
  const page=parsePage(query.page);
  const today = japanToday();
  const result = await searchEventsPage({
    startDate: today,endDate: addDays(today,29),prefecture,categories: [category]
  },page,24);

  const breadcrumb = breadcrumbJsonLd([
    { name: 'まちイベ', path: '/' },
    { name: label, path: `/category/${category}` }
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>{label}</span>
      </nav>
      <p className="eyebrow">CATEGORY</p>
      <h1>{prefecture ? `${prefecture}の` : '全国の'}{label}イベント</h1>
      <p className="area-copy">今日から30日以内の公開・確認済みイベントを表示しています。</p>

      {result.error ? <DataUnavailable /> : result.events.length ? (
        <>
          <div className="event-grid">{result.events.map((event) => <EventCard key={event.id} event={event} />)}</div>
          <Pagination
            basePath={`/category/${category}`}
            page={result.page}
            hasPrevious={result.hasPrevious}
            hasNext={result.hasNext}
            query={{prefecture:prefecture||undefined}}
          />
        </>
      ) : (
        <div className="empty-state"><h2>現在表示できるイベントはありません</h2><p>条件を変えるか、情報追加をお待ちください。</p></div>
      )}
    </main>
  );
}
