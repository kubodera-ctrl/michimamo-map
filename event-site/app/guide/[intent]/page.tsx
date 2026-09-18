import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { SEO_INTENTS, searchSeoIntentEvents, type SeoIntentKey } from '@/lib/seo-intents';
import { breadcrumbJsonLd } from '@/lib/seo';

export function generateStaticParams() {
  return Object.keys(SEO_INTENTS).map((intent) => ({ intent }));
}

export async function generateMetadata({ params }: { params: Promise<{intent:string}> }): Promise<Metadata> {
  const { intent } = await params;
  const config = SEO_INTENTS[intent as SeoIntentKey];
  if (!config) return {};
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: `/guide/${intent}` },
    openGraph: {
      type: 'website',
      title: config.title,
      description: config.description,
      url: `/guide/${intent}`
    }
  };
}

export default async function IntentGuidePage({ params }: { params: Promise<{intent:string}> }) {
  const { intent } = await params;
  const config = SEO_INTENTS[intent as SeoIntentKey];
  if (!config) notFound();

  const events = await searchSeoIntentEvents(intent as SeoIntentKey);
  const breadcrumb = breadcrumbJsonLd([
    { name: 'まちイベ', path: '/' },
    { name: config.heading, path: `/guide/${intent}` }
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>{config.heading}</span>
      </nav>
      <p className="eyebrow">TODAY&apos;S GUIDE</p>
      <h1>{config.heading}</h1>
      <p className="area-copy">{config.description}</p>

      {events.length ? (
        <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
      ) : (
        <div className="empty-state">
          <h2>現在表示できるイベントはありません</h2>
          <p>公開・確認済み情報が追加され次第、このページに反映されます。</p>
        </div>
      )}
    </main>
  );
}
