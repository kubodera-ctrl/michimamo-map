import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DataUnavailable } from '@/components/DataUnavailable';
import { EventCard } from '@/components/EventCard';
import { Pagination } from '@/components/Pagination';
import { FANDOM_LABELS, FANDOM_OPTIONS, addDays, japanToday, parsePage, searchEvents, searchEventsPage } from '@/lib/events';
import { breadcrumbJsonLd, safeJsonLd } from '@/lib/seo';
import { searchIndexingAllowed } from '@/lib/url-config';

export const revalidate = 3600;

const aliases: Record<string,string> = {
  'pokemon':'ポケモン・Pokémon・Pokemon','sanrio':'サンリオ・Sanrio',
  'hello-kitty':'ハローキティ・キティ','cinnamoroll':'シナモロール・シナモン',
  'super-mario':'スーパーマリオ・マリオ','kirby':'星のカービィ・カービィ',
  'animal-crossing':'どうぶつの森・あつ森',
  'my-hero-academia':'僕のヒーローアカデミア・ヒロアカ・My Hero Academia',
  'haikyu':'ハイキュー!!・ハイキュー・HAIKYU!!',
  'jujutsu-kaisen':'呪術廻戦・呪術・Jujutsu Kaisen',
  'hunter-x-hunter':'HUNTER×HUNTER・ハンターハンター・ハンター×ハンター',
  'naruto':'NARUTO・ナルト',
  'bleach':'BLEACH・ブリーチ',
  'gintama':'銀魂・ぎんたま',
  'prince-of-tennis':'テニスの王子様・テニプリ・新テニ',
  'kuroko-basketball':'黒子のバスケ・黒バス',
  'world-trigger':'ワールドトリガー・ワートリ',
  'blue-exorcist':'青の祓魔師・青エク',
  'chainsaw-man':'チェンソーマン・Chainsaw Man',
  'sakamoto-days':'SAKAMOTO DAYS・サカモトデイズ・サカデイ',
  'shinako':'しなこ・しなこちゃん',
  'takeshita-paradise':'竹下☆ぱらだいす・竹下ぱらだいす・竹ぱら',
  'colorful-peach':'カラフルピーチ・からぴち','tiropino':'ちろぴの・チロピノ',
  'bom-bom-tv':'ボンボンTV・ボンボンティービー','rocomacoaco':'ろこまこあこ',
  'detective-conan':'コナン・名探偵コナン','sumikkogurashi':'すみっこぐらし・すみっコぐらし',
  'ghibli':'ジブリ・スタジオジブリ','pixar':'ピクサー・Pixar'
};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;

export function generateStaticParams() {
  return FANDOM_OPTIONS.map(([slug]) => ({ slug }));
}

const oshiRange=()=>({startDate:japanToday(),endDate:addDays(japanToday(),90)});

export async function generateMetadata({
  params,searchParams
}: {
  params: Promise<{slug:string}>;
  searchParams:SearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const query=await searchParams;
  const page=parsePage(query.page);
  const label=FANDOM_LABELS[slug];
  if (!label) return {};
  const range=oshiRange();
  const sample=await searchEvents({...range,fandomSlugs:[slug],limit:3});
  const allowIndexing=searchIndexingAllowed();
  const title=`${label}のイベント｜コラボ・ポップアップ・おでかけ情報`;
  const description=`${aliases[slug] || label}に関連する公開・確認済みイベントを探せます。開催日、地域、会場、公式情報を確認できます。`;
  return {
    title,description,alternates:{canonical:`/oshi/${slug}`},
    robots: allowIndexing && page===1 && sample.length>=3 ? {index:true,follow:true} : {index:false,follow:allowIndexing},
    openGraph:{type:'website',title,description,url:`/oshi/${slug}`}
  };
}

export default async function OshiPage({
  params,searchParams
}: {
  params: Promise<{slug:string}>;
  searchParams:SearchParams;
}) {
  const {slug}=await params;
  const query=await searchParams;
  const page=parsePage(query.page);
  const label=FANDOM_LABELS[slug];
  if (!label) notFound();
  const range=oshiRange();
  const result=await searchEventsPage({...range,fandomSlugs:[slug],sort:'recommended'},page,24);
  const breadcrumb=breadcrumbJsonLd([
    {name:'まちイベ',path:'/'},
    {name:`推し活：${label}`,path:`/oshi/${slug}`}
  ]);

  return (
    <main className="content-wrap area-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(breadcrumb)}} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link><span>›</span><span>推し活：{label}</span>
      </nav>
      <p className="eyebrow">OSHI KATSU</p>
      <h1>{label}のイベント</h1>
      <p className="area-copy">{aliases[slug] || label}に関連する、出典確認済みのイベントを表示します。公式・公認等の関係性は確認できた情報だけを扱います。</p>
      <p className="seo-note">まちイベは各権利者・出演者の公式サイトではありません。名称はイベント検索・識別のために使用し、画像・ロゴは利用条件を確認できた場合のみ表示します。</p>

      {result.error ? <DataUnavailable /> : result.events.length ? (
        <>
          <div className="event-grid">{result.events.map((event)=><EventCard key={event.id} event={event} />)}</div>
          <Pagination basePath={`/oshi/${slug}`} page={result.page} hasPrevious={result.hasPrevious} hasNext={result.hasNext} />
        </>
      ) : (
        <div className="empty-state">
          <h2>現在表示できるイベントはありません</h2>
          <p>公開・確認済みの関連イベントが追加され次第、このページに反映されます。</p>
        </div>
      )}
    </main>
  );
}
