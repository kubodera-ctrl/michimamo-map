import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ADMIN_COOKIE, validateAdminSession } from '@/lib/admin-auth';
import { CATEGORY_OPTIONS, FANDOM_LABELS, PRICE_LABELS, formatEventDate, getEvent } from '@/lib/events';
import { buildTikTokCaption } from '@/lib/tiktok';
import { TikTokAssetGenerator } from '@/components/TikTokAssetGenerator';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'TikTok投稿素材',robots:{index:false,follow:false}};

const categoryLabels=Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;
type Params=Promise<{slug:string}>;

export default async function AdminTikTokPage({params}:{params:Params}){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  const {slug}=await params;
  const event=await getEvent(slug);
  if(!event) notFound();
  if(['cancelled','postponed','sold_out','registration_closed'].includes(event.event_status)) {
    redirect('/admin?error=tiktok-unavailable');
  }

  const dateText=formatEventDate(event.start_date,event.end_date);
  const timeText=event.start_time
    ? (event.end_time?`${event.start_time.slice(0,5)}〜${event.end_time.slice(0,5)}`:event.start_time.slice(0,5))
    : '時間未定';
  const audienceLabel=event.audience_intent==='child_centered'
    ? '子どもが主役'
    : event.audience_intent==='family_friendly'
      ? 'ファミリー向け'
      : '';
  const fandomLabels=event.fandom_slugs.map((key)=>FANDOM_LABELS[key]||key);
  const categories=event.category_keys.map((key)=>categoryLabels[key]||key);
  const tags=[
    audienceLabel,
    PRICE_LABELS[event.price_type],
    event.indoor===true?'屋内':'',
    event.accessibility_keys.length?'配慮情報あり':'',
    ...fandomLabels.slice(0,1),
    ...categories.slice(0,1)
  ].filter(Boolean);

  const caption=buildTikTokCaption({
    title:event.title,
    prefecture:event.prefecture,
    municipality:event.municipality,
    venueName:event.venue_name,
    dateText,
    timeText,
    audienceLabel,
    priceLabel:PRICE_LABELS[event.price_type],
    indoor:event.indoor===true,
    fandomLabels,
    categoryLabels:categories
  });

  return (
    <main className="admin-shell tiktok-admin-shell">
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/admin">運営ダッシュボード</Link><span>›</span><span>TikTok投稿素材</span>
      </nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">MACHI IBE SOCIAL ASSET</p>
          <h1>TikTok投稿素材を自動生成</h1>
          <p>{event.title}</p>
        </div>
        <Link className="admin-back-link" href="/admin#new-events">新着イベント一覧へ戻る</Link>
      </div>
      <div className="admin-bottom-note">
        <strong>自動投稿はしません</strong>
        <p>確認済みイベント情報だけでPNGと投稿文を生成します。保存・コピー後、TikTokアプリから手動投稿してください。</p>
      </div>
      <TikTokAssetGenerator
        slug={event.slug}
        title={event.title}
        location={[event.prefecture,event.municipality].filter(Boolean).join(' ')}
        dateText={dateText}
        timeText={timeText}
        venueName={event.venue_name||''}
        tags={tags}
        caption={caption}
      />
    </main>
  );
}
