import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata:Metadata={
  title:'プライバシー',
  description:'まちイベの端末保存・アクセス解析に関する説明。',
  robots:{index:true,follow:true},
  alternates:{canonical:'/privacy'}
};

export default function PrivacyPage() {
  const analyticsEnabled=Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>プライバシー</span></nav>
      <p className="eyebrow">PRIVACY</p>
      <h1>プライバシーについて</h1>
      <section className="policy-card">
        <h2>端末内に保存する情報</h2>
        <p>「行きたい」「行った」「今後表示しない」「閲覧済み」「保存した検索」などは、ログインしていない段階ではブラウザのローカルストレージに保存します。これらは端末内の利便性のために使います。</p>
        <h2>アクセス解析</h2>
        <p>{analyticsEnabled ? 'サイト改善のためGoogle Analyticsを利用する設定です。主要な操作は個人を直接識別しないイベント名・イベント識別子の範囲で計測します。' : '現在のコードではアクセス解析IDが未設定のため、Google Analyticsは送信されません。本番で利用する場合は公開前に設定と告知を確認します。'}</p>
        <h2>外部サービス</h2>
        <p>Google Maps、Apple Maps、Google Calendar、駐車場予約、飲食店等の外部サービスへ移動した後は、それぞれのサービスの規約・プライバシーポリシーが適用されます。</p>
      </section>
    </main>
  );
}
