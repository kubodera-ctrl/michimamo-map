import type { Metadata } from 'next';
import Link from 'next/link';
import { normalizeGaMeasurementId } from '@/lib/analytics-config';

export const metadata:Metadata={
  title:'プライバシー',
  description:'まちイベの端末保存・アクセス解析に関する説明。',
  robots:{index:true,follow:true},
  alternates:{canonical:'/privacy'}
};

export default function PrivacyPage() {
  const analyticsEnabled=Boolean(normalizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>プライバシー</span></nav>
      <p className="eyebrow">PRIVACY</p>
      <h1>プライバシーについて</h1>
      <section className="policy-card">
        <h2>端末内に保存する情報</h2>
        <p>「行きたい」「行った」「今後表示しない」「閲覧済み」「保存した検索」などは、ログインしていない段階ではブラウザのローカルストレージに保存します。これらは端末内の利便性のために使います。</p>
        <h2>アクセス解析</h2>
        <p>{analyticsEnabled ? 'サイト改善のためGoogle Analyticsを利用する設定です。Google Analyticsには検索語を送らず、主要操作とイベント識別子を中心に計測します。サイト内の検索語集計はメールアドレス・長い数列・URLなどを送信前に除外し、個人識別子を持たない集計値として扱います。検索語集計は90日を超えた日次データを削除します。' : '現在のコードではアクセス解析IDが未設定のため、Google Analyticsは送信されません。サイト内の検索語集計はメールアドレスや長い数列などを送信前に除外し、個人識別子を持たない集計値として扱います。'}</p>
        <h2>外部サービス</h2>
        <p>Google Maps、Apple Maps、Google Calendar、OpenStreetMap、駐車場予約、飲食店等の外部サービスへ移動した後は、それぞれのサービスの規約・プライバシーポリシーが適用されます。</p>
      </section>
    </main>
  );
}
