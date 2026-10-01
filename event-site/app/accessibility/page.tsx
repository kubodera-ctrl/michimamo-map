import type {Metadata} from 'next';
import Link from 'next/link';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';

export const metadata:Metadata={
  title:'アクセシビリティ方針',
  description:'まちイベのWebアクセシビリティ改善方針。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/accessibility'}
};

export default function AccessibilityPage(){
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>アクセシビリティ</span></nav>
      <p className="eyebrow">ACCESSIBILITY</p>
      <h1>アクセシビリティ方針</h1>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card">
        <h2>基本方針</h2>
        <p>まちイベは、年齢、端末、障害の有無等にかかわらず、イベントを探しやすいサービスを目指します。特定の適合レベルを達成済みと宣言するものではありませんが、WCAG等の考え方を参考に継続的に改善します。</p>

        <h2>取り組む項目</h2>
        <ul>
          <li>キーボード操作とフォーカス表示</li>
          <li>見出し・ラベル・ランドマーク等の意味構造</li>
          <li>文字サイズ、色のコントラスト、スマートフォン表示</li>
          <li>画像に依存しない重要情報の提供</li>
          <li>動き・透明効果等を苦手とする利用者への配慮</li>
          <li>エラーや0件状態を分かりやすく伝える表示</li>
        </ul>

        <h2>障害者向け・配慮情報</h2>
        <p>イベント検索では、障害者向け割引、付き添い、字幕、バリアフリー等の確認済み情報を扱う場合があります。未確認の配慮内容を推測で表示しません。必要な配慮は、必ず主催者・施設へ事前確認してください。</p>

        <h2>画像・動画</h2>
        <p>重要な日時・会場・料金等を画像だけに埋め込まず、可能な限りテキストでも提供します。運営SNS素材も、サイト上のイベント詳細を参照できる導線を用意します。</p>

        <h2>改善依頼</h2>
        <p>操作できない箇所、読み上げにくい表示、色や文字の問題等がある場合は、<Link href="/operator">運営者情報</Link>の窓口から対象ページと状況をお知らせください。</p>
      </section>
    </main>
  );
}
