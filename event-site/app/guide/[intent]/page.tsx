import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { EventCard } from '@/components/EventCard';
import { Pagination } from '@/components/Pagination';
import { parsePage } from '@/lib/events';
import { SEO_INTENTS, searchSeoIntentEvents, type SeoIntentKey } from '@/lib/seo-intents';
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';

export const revalidate = 3600;

type SearchParams=Promise<Record<string,string|string[]|undefined>>;

export function generateStaticParams() {
  return Object.keys(SEO_INTENTS).map((intent) => ({ intent }));
}

export async function generateMetadata({
  params,searchParams
}: {
  params: Promise<{intent:string}>;
  searchParams:SearchParams;
}): Promise<Metadata> {
  const { intent } = await params;
  const query=await searchParams;
  const page=parsePage(query.page);
  const config = SEO_INTENTS[intent as SeoIntentKey];
  if (!config) return {};
  const sample=await searchSeoIntentEvents(intent,1,3);
  const allowIndexing=process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true' && Boolean(process.env.NEXT_PUBLIC_SITE_URL);
  return {
    title: config.title,description: config.description,
    alternates: { canonical: `/guide/${intent}` },
    robots: allowIndexing && page===1 && sample.events.length>=3 ? {index:true,follow:true} : {index:false,follow:allowIndexing},
    openGraph: { type: 'website',title: config.title,description: config.description,url: `/guide/${intent}` }
  };
}

export default async function IntentGuidePage({
  params,searchParams
}: {
  params: Promise<{intent:string}>;
  searchParams:SearchParams;
}) {
  const { intent } = await params;
  const query=await searchParams;
  const page=parsePage(query.page);
  const config = SEO_INTENTS[intent as SeoIntentKey];
  if (!config) notFound();

  const result = await searchSeoIntentEvents(intent,page,24);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'まちイベ', path: '/' },
    { name: config.heading, path: `/guide/${intent}` }
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>{config.heading}</span>
      </nav>
      <p className="eyebrow">TODAY&apos;S GUIDE</p>
      <h1>{config.heading}</h1>
      <p className="area-copy">{config.description}</p>

      {result.error ? <DataUnavailable /> : result.events.length ? (
        <>
          <div className="event-grid">{result.events.map((event) => <EventCard key={event.id} event={event} />)}</div>
          <Pagination basePath={`/guide/${intent}`} page={result.page} hasPrevious={result.hasPrevious} hasNext={result.hasNext} />
        </>
      ) : (
        <div className="empty-state">
          <h2>現在表示できるイベントはありません</h2>
          <p>公開・確認済み情報が追加され次第、このページに反映されます。</p>
        </div>
      )}
    </main>
  );
}
