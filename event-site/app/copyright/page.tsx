import type {Metadata} from 'next';
import Link from 'next/link';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';

export const metadata:Metadata={
  title:'著作権・商標・リンク方針',
  description:'まちイベの独自コンテンツ、第三者の名称・画像・ロゴ、引用、リンクに関する方針。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/copyright'}
};

export default function CopyrightPage(){
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>著作権・商標・リンク</span></nav>
      <p className="eyebrow">COPYRIGHT / TRADEMARK / LINK</p>
      <h1>著作権・商標・リンク方針</h1>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card">
        <h2>1. まちイベ独自コンテンツ</h2>
        <p>まちイベが独自に作成した文章、編集構成、デザイン、ロゴ、プログラム等に関する著作権その他の権利は、運営者または正当な権利者に帰属します。法令上認められる場合を除き、無断で大量複製・再配布・販売することはできません。</p>

        <h2>2. イベント名・施設名・作品名等</h2>
        <p>イベント名、施設名、会社名、作品名、キャラクター名、商標等は、識別・検索・情報案内のために記載する場合があります。これらの権利は各権利者に帰属します。掲載は、特記がない限り公式提携や権利者による推薦を意味しません。</p>

        <h2>3. 画像・ロゴ</h2>
        <p>第三者が権利を有する画像・ロゴ・作品素材は、利用条件、ライセンス、契約または個別許諾を確認できた場合に限って使用します。確認できない場合は原則として使用しません。</p>

        <h2>4. 事実情報と表現</h2>
        <p>開催日、会場、料金等の事実情報と、主催者・媒体が作成した紹介文・写真・デザイン等の著作物は区別して扱います。情報源の文章をそのまま大量転載するのではなく、必要な事実を確認し、まちイベ側の表現で整理することを基本とします。</p>

        <h2>5. 引用</h2>
        <p>第三者著作物を引用する必要がある場合は、法令上認められる範囲で、引用部分と自らの記述を区別し、必要な出典を示します。</p>

        <h2>6. まちイベへのリンク</h2>
        <p>一般公開ページへの通常のリンクは、原則として事前連絡なく行っていただけます。ただし、違法・権利侵害目的のサイト、まちイベが運営しているかのように誤認させる表示、ページ内容を他サイトの一部であるかのように見せるフレーム表示等はお断りする場合があります。</p>

        <h2>7. まちイベからの外部リンク</h2>
        <p>イベント公式サイト、施設、自治体、地図、予約、広告等へリンクする場合があります。リンク先の内容や権利関係は、各運営者に帰属します。</p>

        <h2>8. 権利侵害の申告</h2>
        <p>著作権、商標権、肖像・プライバシーその他の権利に関する問題を発見した場合は、<Link href="/corrections">訂正・掲載停止窓口</Link>から対象URL、問題箇所、権利関係等をご連絡ください。確認のため追加資料をお願いする場合があります。</p>
      </section>
    </main>
  );
}
