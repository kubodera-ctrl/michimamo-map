import type {Metadata} from 'next';
import Link from 'next/link';
import {normalizeGaMeasurementId} from '@/lib/analytics-config';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';

export const metadata:Metadata={
  title:'外部送信について',
  description:'まちイベのアクセス解析、データベース、地図タイル等への外部送信に関する説明。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/external-transmission'}
};

export default function ExternalTransmissionPage(){
  const analyticsEnabled=Boolean(normalizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>外部送信について</span></nav>
      <p className="eyebrow">EXTERNAL TRANSMISSION</p>
      <h1>外部送信について</h1>
      <p className="legal-lead">ページ表示や機能利用に伴い、サービス提供に必要な情報が外部事業者へ送信される場合があります。現在の実装に沿って主な送信先を説明します。</p>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card">
        <h2>Google Analytics / Google</h2>
        <p><strong>利用状況：</strong>{analyticsEnabled?'現在の設定では有効です。':'現在は有効な測定IDが設定されていないため送信しません。'}</p>
        <p><strong>目的：</strong>ページ・機能の利用状況を集計し、検索・UI等を改善するため。</p>
        <p><strong>送信され得る情報：</strong>ページパス、計測イベント名、イベント識別子、参照元、Cookie等の識別子、端末・ブラウザ情報、IPアドレスに関連する情報等。まちイベの生の検索語はGoogle Analyticsへ送信しない設計です。</p>

        <h2>Supabase</h2>
        <p><strong>目的：</strong>公開イベント検索・詳細取得等のデータベース機能を提供するため。</p>
        <p><strong>送信され得る情報：</strong>検索条件、取得対象のイベント識別子、リクエストに伴うIPアドレス・User-Agent等の通信情報。公開クライアントにはservice role等の管理者秘密情報を渡しません。</p>

        <h2>OpenStreetMap タイル</h2>
        <p><strong>利用箇所：</strong>「行きたい」イベント等の地図表示を利用した場合。</p>
        <p><strong>目的：</strong>地図タイルを表示するため。</p>
        <p><strong>送信され得る情報：</strong>タイル取得に必要な地図範囲・ズーム等のリクエスト情報、IPアドレス、User-Agent、参照元等の通信情報。</p>

        <h2>外部画像配信元</h2>
        <p>スポンサー画像や、利用許諾を確認したイベント画像等を外部URLから表示する設定を行った場合、画像取得のため、その配信元へIPアドレス、User-Agent、参照元等の通信情報が送信される場合があります。</p>

        <h2>利用者が操作して移動する外部サービス</h2>
        <p>Google Maps、Apple Maps、Google Calendar、チケット、駐車場、飲食店、広告・アフィリエイト等は、利用者がリンクやボタンを操作して外部サービスへ移動した後、各サービスの規約・プライバシーポリシーに従って情報が処理されます。</p>

        <h2>制御方法</h2>
        <p>ブラウザ設定、コンテンツブロッカー、外部サービスが提供するオプトアウト機能等により、一部のCookieや外部通信を制限できる場合があります。制限によって地図等の一部機能が利用できなくなる場合があります。</p>

        <h2>変更時の更新</h2>
        <p>新たなアクセス解析、広告配信、埋め込みコンテンツ等を導入する場合は、実装に合わせて本ページおよび<Link href="/privacy">プライバシーポリシー</Link>を更新します。</p>
      </section>
    </main>
  );
}
