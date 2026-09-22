import type {Metadata} from 'next';
import Link from 'next/link';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';
import {contactUrl,operatorSiteUrl} from '@/lib/url-config';

export const metadata:Metadata={
  title:'運営者情報',
  description:'全国イベント検索サービス「まちイベ」の運営者情報と問い合わせ窓口。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/operator'}
};

export default function OperatorPage(){
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>運営者情報</span></nav>
      <p className="eyebrow">OPERATOR</p>
      <h1>運営者情報</h1>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card operator-policy-card">
        <dl className="operator-facts">
          <div><dt>サービス名</dt><dd>まちイベ by まちまも</dd></div>
          <div><dt>運営事業者</dt><dd>SUMION合同会社</dd></div>
          <div><dt>サービス内容</dt><dd>全国イベント検索・おでかけ支援、関連情報への導線提供</dd></div>
          <div><dt>現在の状況</dt><dd>β公開準備・全国データ連携準備中</dd></div>
          <div><dt>公式サイト</dt><dd><a href={operatorSiteUrl()} target="_blank" rel="noreferrer">SUMION合同会社 公式サイト ↗</a></dd></div>
          <div><dt>一般問い合わせ</dt><dd><a href={contactUrl()} target="_blank" rel="noreferrer">問い合わせ窓口 ↗</a></dd></div>
          <div><dt>掲載情報</dt><dd><Link href="/corrections">訂正・掲載停止窓口</Link></dd></div>
        </dl>

        <h2>事業者表示について</h2>
        <p>現在、まちイベ自体でイベントチケット等を直接販売する機能はありません。将来、運営者自身が有償の商品・役務をオンライン販売する機能を開始し、法令上追加の事業者表示が必要となる場合は、その開始前に必要事項を掲示します。</p>

        <h2>情報提供・API・スポンサーのご相談</h2>
        <p>自治体、観光協会、施設、API・データ提供事業者、スポンサー等からのご相談は<Link href="/partners">まちイベについて／データ連携ページ</Link>もあわせてご確認ください。</p>
      </section>
    </main>
  );
}
