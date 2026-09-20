import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { EventCard } from '@/components/EventCard';
import { Pagination } from '@/components/Pagination';
import { CATEGORY_OPTIONS, addDays, japanToday, parsePage, searchEvents, searchEventsPage } from '@/lib/events';
import { PREFECTURES, prefectureBySlug } from '@/lib/prefectures';
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';

export const revalidate = 3600;

type SearchParams=Promise<Record<string,string|string[]|undefined>>;

export function generateStaticParams() {
  return PREFECTURES.map(([prefecture]) => ({ prefecture }));
}

export async function generateMetadata({
  params,searchParams
}: {
  params: Promise<{prefecture:string}>;
  searchParams:SearchParams;
}): Promise<Metadata> {
  const { prefecture } = await params;
  const query=await searchParams;
  const page=parsePage(query.page);
  const name = prefectureBySlug[prefecture];
  if (!name) return {};
  const today=japanToday();
  const sample=await searchEvents({startDate:today,endDate:addDays(today,29),prefecture:name,limit:3});
  const allowIndexing=process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true' && Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  const title = `${name}のイベント｜今日・今週末・子ども向けのおでかけ`;
  const description = `${name}の今日・今週末・30日以内のイベントを検索。子ども向け、無料、屋内、障害者向け配慮などの条件にも対応。`;
  return {
    title,description,
    alternates: { canonical: `/area/${prefecture}` },
    robots: allowIndexing && page===1 && sample.length>=3 ? {index:true,follow:true} : {index:false,follow:allowIndexing},
    openGraph: { title, description, url: `/area/${prefecture}`, type: 'website' }
  };
}

export default async function PrefecturePage({
  params,searchParams
}: {
  params: Promise<{prefecture:string}>;
  searchParams:SearchParams;
}) {
  const { prefecture } = await params;
  const query=await searchParams;
  const page=parsePage(query.page);
  const name = prefectureBySlug[prefecture];
  if (!name) notFound();

  const today = japanToday();
  const result = await searchEventsPage({ startDate: today, endDate: addDays(today,29), prefecture: name },page,24);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'まちイベ', path: '/' },
    { name: name, path: `/area/${prefecture}` }
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>{name}</span>
      </nav>
      <p className="eyebrow">AREA</p>
      <h1>{name}のイベント</h1>
      <p className="area-copy">今日から30日以内の公開・確認済みイベントを表示しています。開催内容は公式情報もあわせてご確認ください。</p>

      {result.error ? <DataUnavailable /> : result.events.length ? (
        <>
          <div className="event-grid">{result.events.map((event) => <EventCard key={event.id} event={event} />)}</div>
          <Pagination basePath={`/area/${prefecture}`} page={result.page} hasPrevious={result.hasPrevious} hasNext={result.hasNext} />
        </>
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
