import type { Metadata } from 'next';
import Link from 'next/link';
import { MetricPing } from '@/components/MetricPing';

export const metadata:Metadata={
  title:'掲載情報の訂正・掲載停止',
  description:'まちイベの掲載情報に関する訂正・掲載停止窓口。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/corrections'}
};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

export default async function CorrectionsPage({searchParams}:{searchParams:SearchParams}) {
  const params=await searchParams;
  const event=one(params.event);
  const formUrl=process.env.NEXT_PUBLIC_CORRECTION_FORM_URL || '';
  return (
    <main className="content-wrap area-page">
      <MetricPing metric="correction_open" eventSlug={event||undefined} />
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>掲載情報の訂正</span></nav>
      <p className="eyebrow">CORRECTION</p>
      <h1>掲載情報の訂正・掲載停止</h1>
      <p className="area-copy">開催日時、会場、料金、中止・延期、画像、掲載停止など、掲載内容に誤りがある場合の窓口です。</p>
      <section className="correction-card">
        {event && <p><strong>対象イベントID：</strong><code>{event}</code></p>}
        <p>確認後、出典と照合して訂正します。主催者・権利者からの掲載停止依頼も同じ窓口で受け付ける想定です。</p>
        {formUrl ? (
          <a className="primary-action correction-action" href={formUrl} target="_blank" rel="noreferrer">訂正・掲載停止フォームを開く</a>
        ) : (
          <div className="config-notice">公開前設定：Vercelの <code>NEXT_PUBLIC_CORRECTION_FORM_URL</code> に窓口フォームを設定するとボタンが有効になります。</div>
        )}
      </section>
    </main>
  );
}
