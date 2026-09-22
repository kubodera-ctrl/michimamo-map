import type {Metadata} from 'next';
import Link from 'next/link';
import {MetricPing} from '@/components/MetricPing';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';
import {contactUrl,correctionFormUrl} from '@/lib/url-config';

export const metadata:Metadata={
  title:'掲載情報の訂正・掲載停止',
  description:'まちイベの掲載情報に関する訂正、掲載停止、権利侵害申告の窓口と対応方針。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/corrections'}
};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

export default async function CorrectionsPage({searchParams}:{searchParams:SearchParams}){
  const params=await searchParams;
  const event=one(params.event).slice(0,160);
  const formUrl=correctionFormUrl();
  const fallback=contactUrl();

  return (
    <main className="content-wrap legal-page">
      <MetricPing metric="correction_open" eventSlug={event||undefined} />
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>訂正・掲載停止</span></nav>
      <p className="eyebrow">CORRECTION / TAKEDOWN</p>
      <h1>掲載情報の訂正・掲載停止</h1>
      <p className="legal-lead">開催情報の誤り、中止・延期、権利関係、掲載停止等を確認するための窓口です。</p>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card correction-policy-card">
        {event && <div className="correction-target"><strong>対象イベントID</strong><code>{event}</code></div>}

        <h2>受け付ける内容</h2>
        <ul>
          <li>開催日時・会場・料金・予約条件等の誤り</li>
          <li>中止、延期、完売、受付終了等の状態変更</li>
          <li>主催者・施設・公式URL等の訂正</li>
          <li>画像、文章、商標、肖像、プライバシー等の権利に関する申告</li>
          <li>主催者・施設・権利者からの掲載停止依頼</li>
        </ul>

        <h2>ご連絡いただきたい情報</h2>
        <ul>
          <li>対象となるまちイベのURLまたはイベント名</li>
          <li>訂正・停止を希望する箇所と正しい内容</li>
          <li>確認できる公式ページ等のURL</li>
          <li>主催者・権利者としての申告の場合、確認に必要な所属・連絡先等</li>
        </ul>
        <p>本人確認書類等は、必要性がない限り送信しないでください。権利関係の確認が必要な場合に限り、追加資料をお願いすることがあります。</p>

        <h2>対応方法</h2>
        <p>申告内容と情報源を確認し、訂正、ステータス変更、一時非表示、掲載停止等の対応を行います。重大な権利侵害や安全上の懸念がある場合は、確認中に一時非表示とする場合があります。</p>

        <h2>対応順序</h2>
        <p>開催中・直近開催の重大な誤情報、安全に関わる情報、権利侵害の疑い等を優先して確認します。すべての申告への即時対応や個別回答を保証するものではありません。</p>

        <h2>虚偽申告</h2>
        <p>第三者になりすました申告、故意に虚偽の情報を提出する行為、業務妨害を目的とした大量申告等はお断りします。</p>

        <div className="correction-actions">
          {formUrl ? (
            <a className="primary-action correction-action" href={formUrl} target="_blank" rel="noreferrer">訂正・掲載停止フォームを開く</a>
          ) : (
            <a className="primary-action correction-action" href={fallback} target="_blank" rel="noreferrer">運営者へ問い合わせる</a>
          )}
          <Link className="secondary-policy-action" href="/data-policy">イベント情報・データポリシー</Link>
        </div>
      </section>
    </main>
  );
}
