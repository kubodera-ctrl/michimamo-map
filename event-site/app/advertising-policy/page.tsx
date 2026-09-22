import type {Metadata} from 'next';
import Link from 'next/link';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';

export const metadata:Metadata={
  title:'広告・アフィリエイトポリシー',
  description:'まちイベのPR、スポンサー、アフィリエイトリンク、広告表示と検索結果の分離に関する方針。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/advertising-policy'}
};

export default function AdvertisingPolicyPage(){
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>広告・アフィリエイト</span></nav>
      <p className="eyebrow">ADVERTISING POLICY</p>
      <h1>広告・アフィリエイトポリシー</h1>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card">
        <h2>1. 広告を利用する理由</h2>
        <p>まちイベは、サイト運営・データ更新・開発を継続するため、スポンサー広告、アフィリエイト広告、運営者からのお知らせ等を掲載する場合があります。</p>

        <h2>2. PR・広告であることの明示</h2>
        <p>広告主や提携先から対価、成果報酬、無償提供その他の経済的関係があり、利用者の判断に影響し得る表示は、「PR」「広告」「スポンサー」「プロモーション」等、広告であることが分かる表示を付けます。</p>
        <p>ページ冒頭の一括表示だけで不十分となる場合は、該当する広告枠・記事・リンクの近くにも表示します。</p>

        <h2>3. アフィリエイトリンク</h2>
        <p>一部の外部リンクはアフィリエイトリンクとなる場合があり、利用者がリンク先で申込み・購入等を行った場合、まちイベが紹介料を受け取ることがあります。原則として、利用者が支払う通常価格に紹介料が上乗せされることを意味するものではありません。</p>

        <h2>4. 通常検索結果との分離</h2>
        <p>スポンサー料や成果報酬だけを理由に、通常のイベント検索結果を未表示の広告順位へ変更しません。スポンサー枠、PRカード、タイアップ等を通常コンテンツと混同しやすい形で表示する場合は、広告であることを明示します。</p>

        <h2>5. 編集・掲載判断</h2>
        <p>広告掲載の有無にかかわらず、イベントの開催状態、出典確認、公開基準等には<Link href="/data-policy">イベント情報・データポリシー</Link>を適用します。広告主からの依頼だけを理由に、確認できない事実を掲載しません。</p>

        <h2>6. 広告リンク先</h2>
        <p>広告・アフィリエイトリンクの遷移先は外部サービスです。商品・サービス内容、価格、契約、支払、解約、個人情報の取り扱い等は、各広告主・提供者の最新情報をご確認ください。</p>

        <h2>7. 広告主への個人情報販売</h2>
        <p>まちイベが保有する利用者の個人情報を、広告配信を目的として広告主へ販売する運用は行いません。広告ネットワーク等の外部サービスを導入する場合は、プライバシーポリシーで送信情報・目的を説明します。</p>

        <h2>8. 掲載を受け付けない広告</h2>
        <p>法令違反、権利侵害、著しい誤認を招く表示、実態の確認できないサービス、安全上重大な懸念があるもの、その他まちイベの利用者保護の観点から不適切と判断した広告は、掲載を断るまたは停止する場合があります。</p>

        <h2>9. 広告に関する訂正</h2>
        <p>広告表示やスポンサー表記に問題がある場合は、<Link href="/operator">運営者情報</Link>に記載する窓口からご連絡ください。</p>
      </section>
    </main>
  );
}
