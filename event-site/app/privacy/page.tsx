import type {Metadata} from 'next';
import Link from 'next/link';
import {normalizeGaMeasurementId} from '@/lib/analytics-config';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';
import {operatorSiteUrl} from '@/lib/url-config';

export const metadata:Metadata={
  title:'プライバシーポリシー',
  description:'まちイベにおける端末保存、アクセス解析、Cookie・外部送信、問い合わせ情報等の取り扱い。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/privacy'}
};

export default function PrivacyPage(){
  const analyticsEnabled=Boolean(normalizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID));
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>プライバシー</span></nav>
      <p className="eyebrow">PRIVACY</p>
      <h1>プライバシーポリシー</h1>
      <p className="legal-lead">SUMION合同会社は、「まちイベ」における利用者情報を、サービス提供・安全運用・改善に必要な範囲で取り扱います。</p>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card">
        <h2>1. 取得・保存する情報</h2>
        <h3>端末内に保存する情報</h3>
        <p>「行きたい」「行った」「今後表示しない」「閲覧済み」「保存した検索」等は、ログインを伴わない段階ではブラウザのローカルストレージ等に保存します。これらは端末内の利便性のために利用し、ブラウザデータを削除すると消える場合があります。</p>

        <h3>サイト利用状況</h3>
        <p>ページ表示、イベント詳細表示、検索、カレンダー追加、まちまもMAPへの遷移等の操作を、個人を識別することを目的としない集計情報として記録する場合があります。イベント識別子を利用する場合があります。</p>

        <h3>検索語</h3>
        <p>サイト内検索の改善目的で検索語を集計する場合があります。メールアドレス、長い数列、URL等は送信・保存前に除外する仕組みを設けています。Google Analyticsには、まちイベの生の検索語を送信しません。</p>

        <h3>問い合わせ・訂正依頼</h3>
        <p>問い合わせフォームや掲載情報の訂正・掲載停止申請を利用した場合、利用者が入力した氏名、所属、連絡先、申請内容、確認資料等を、対応に必要な範囲で取り扱います。外部フォームを利用する場合は、当該フォーム提供者のプライバシーポリシーも適用されます。</p>

        <h3>技術ログ</h3>
        <p>ホスティング、CDN、データベース等の提供者により、IPアドレス、時刻、User-Agent、エラー情報等の技術ログが安全運用・不正利用防止のため記録される場合があります。</p>

        <h2>2. 利用目的</h2>
        <ul>
          <li>検索、保存、予定作成等の機能提供</li>
          <li>障害調査、不正利用防止、セキュリティ確保</li>
          <li>利用状況の集計、UI・検索品質・掲載品質の改善</li>
          <li>問い合わせ、訂正、掲載停止、権利侵害申告への対応</li>
          <li>法令・規約への対応および運営上必要な連絡</li>
        </ul>

        <h2 id="external-transmission">3. Cookie・外部送信・アクセス解析</h2>
        <p>{analyticsEnabled
          ? '現在の設定ではGoogle Analyticsを利用します。ページパス、イベント種別、イベント識別子等を計測し、まちイベの生の検索語は送信しません。Google Analytics側ではCookieその他の識別子、端末・ブラウザ情報、IPアドレスに関連する情報等が処理される場合があります。'
          : '現在は有効なGoogle Analytics測定IDが設定されていないため、Google Analyticsへの送信は行いません。将来有効化する場合は、本ポリシーの内容に従って利用します。'}</p>
        <p>利用者は、ブラウザ設定、コンテンツブロッカー、Googleが提供するオプトアウト手段等により、Cookieや解析を制限できる場合があります。制限した場合でも、主要なイベント検索機能が利用できる設計を目指します。</p>

        <h2>4. 外部サービス</h2>
        <p>地図表示でOpenStreetMap由来の地図タイル等を利用する場合があります。また、Google Maps、Apple Maps、Google Calendar、駐車場、飲食店、チケット、広告・アフィリエイト等の外部サービスへ移動した後は、各サービスの規約・プライバシーポリシーが適用されます。外部サービスでは国外を含む地域で情報が処理される場合があります。</p>

        <h2>5. 第三者提供・委託</h2>
        <p>法令に基づく場合等を除き、取得した個人情報を本人の同意なく目的外に第三者提供しません。ホスティング、データベース、アクセス解析、問い合わせフォーム等の業務委託先に必要な範囲で取り扱いを委託する場合があります。</p>

        <h2>6. 保存期間</h2>
        <ul>
          <li>端末内保存：利用者がブラウザデータを削除するまで、または機能側で削除するまで</li>
          <li>検索語の日次集計：原則90日を超えたデータを削除</li>
          <li>その他の個人識別を目的としない集計：運営改善に必要な期間</li>
          <li>問い合わせ・訂正対応情報：対応、紛争防止、法令上必要な範囲で保管後に削除・匿名化</li>
          <li>インフラログ：各提供者の設定・保存方針に従う</li>
        </ul>

        <h2>7. 未成年者</h2>
        <p>まちイベは家族での利用を想定していますが、子どもの氏名・連絡先等を積極的に収集することを目的としていません。未成年者が問い合わせ等で個人情報を送信する場合は、必要に応じて保護者と相談してください。</p>

        <h2>8. 安全管理</h2>
        <p>アクセス制御、秘密情報の分離、入力制限、権限管理等、取り扱う情報の性質に応じた合理的な安全管理措置を講じるよう努めます。</p>

        <h2>9. 開示等の相談・問い合わせ</h2>
        <p>法令に基づく開示、訂正、利用停止等の請求や、プライバシーに関する相談は、<a href={operatorSiteUrl()} target="_blank" rel="noreferrer">運営者公式サイト</a>の連絡窓口からお問い合わせください。掲載イベント自体の訂正・掲載停止は<Link href="/corrections">専用窓口</Link>をご利用ください。</p>

        <h2>10. 改定</h2>
        <p>サービス内容、利用する外部サービス、法令等の変更に応じて本ポリシーを改定する場合があります。重要な変更は、サイト上で分かりやすく告知するよう努めます。</p>
      </section>
    </main>
  );
}
