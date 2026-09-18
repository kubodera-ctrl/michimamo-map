import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard } from '@/components/EventCard';
import { FANDOM_LABELS, FANDOM_OPTIONS, addDays, japanToday, searchEvents } from '@/lib/events';
import { breadcrumbJsonLd } from '@/lib/seo';

const aliases: Record<string,string> = {
  'detective-conan':'コナン・名探偵コナン',
  'sumikkogurashi':'すみっこぐらし・すみっコぐらし',
  'ghibli':'ジブリ・スタジオジブリ',
  'pixar':'ピクサー・Pixar'
};

export function generateStaticParams() {
  return FANDOM_OPTIONS.map(([slug]) => ({ slug }));
}

async function getOshiEvents(slug:string, limit=60) {
  const today=japanToday();
  return searchEvents({
    startDate: today,
    endDate: addDays(today,90),
    fandomSlugs:[slug],
    sort:'recommended',
    limit
  });
}

export async function generateMetadata({ params }: { params: Promise<{slug:string}> }): Promise<Metadata> {
  const { slug } = await params;
  const label=FANDOM_LABELS[slug];
  if (!label) return {};
  const events=await getOshiEvents(slug,4);
  const title=`${label}のイベント｜コラボ・ポップアップ・おでかけ情報`;
  const description=`${aliases[slug] || label}に関連する公開・確認済みイベントを探せます。開催日、地域、会場、公式情報を確認できます。`;
  return {
    title,
    description,
    alternates:{canonical:`/oshi/${slug}`},
    robots: events.length >= 3 ? {index:true,follow:true} : {index:false,follow:true},
    openGraph:{type:'website',title,description,url:`/oshi/${slug}`}
  };
}

export default async function OshiPage({ params }: { params: Promise<{slug:string}> }) {
  const {slug}=await params;
  const label=FANDOM_LABELS[slug];
  if (!label) notFound();
  const events=await getOshiEvents(slug);
  const breadcrumb=breadcrumbJsonLd([
    {name:'まちイベ',path:'/'},
    {name:`推し活：${label}`,path:`/oshi/${slug}`}
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>推し活：{label}</span>
      </nav>
      <p className="eyebrow">OSHI KATSU</p>
      <h1>{label}のイベント</h1>
      <p className="area-copy">
        {aliases[slug] || label}に関連する、出典確認済みのイベントを表示します。公式・公認等の関係性は確認できた情報だけを扱います。
      </p>
      {events.length ? (
        <div className="event-grid">{events.map((event)=><EventCard key={event.id} event={event} />)}</div>
      ) : (
        <div className="empty-state">
          <h2>現在表示できるイベントはありません</h2>
          <p>公開・確認済みの関連イベントが追加され次第、このページに反映されます。</p>
        </div>
      )}
    </main>
  );
}
