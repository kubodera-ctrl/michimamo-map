import type {Metadata} from 'next';
import Link from 'next/link';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';

export const metadata:Metadata={
  title:'免責事項',
  description:'まちイベのイベント情報、外部サービス、地図・安全情報等に関する免責事項。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/disclaimer'}
};

export default function DisclaimerPage(){
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/policies">ポリシー・規約</Link><span>›</span><span>免責事項</span></nav>
      <p className="eyebrow">DISCLAIMER</p>
      <h1>免責事項</h1>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>

      <section className="policy-card">
        <h2>イベント情報</h2>
        <p>掲載情報の正確性・最新性の向上に努めますが、主催者側の変更、情報更新の時間差、取得障害等により、実際の内容と異なる場合があります。来場・予約・購入前に公式サイト等で最新情報をご確認ください。</p>

        <h2>中止・延期・完売等</h2>
        <p>天候、災害、出演者・施設の事情、定員到達等により、予告なく変更・中止・延期・完売・受付終了となる場合があります。まちイベ上の表示が最新状態へ反映されるまで時間差が生じることがあります。</p>

        <h2>料金・予約・在庫</h2>
        <p>料金、割引、予約枠、残席、商品在庫等は外部サービス側で変更される場合があります。最終的な契約条件は、申込み先・購入先の表示をご確認ください。</p>

        <h2>地図・位置情報</h2>
        <p>住所や座標には誤差が含まれる場合があります。移動前に会場公式情報や地図サービスで確認してください。ナビゲーション結果、経路、所要時間、道路状況等を保証するものではありません。</p>

        <h2>暑さ・天候・安全情報</h2>
        <p>暑さ指数、周辺施設、AED、交番その他の安全関連情報は、判断を補助する参考情報です。緊急時は、現地の状況、行政・気象機関・警察・消防・施設スタッフ等の案内を優先してください。</p>

        <h2>アクセシビリティ情報</h2>
        <p>障害者向け配慮、割引、バリアフリー設備等は、イベントごと・日程ごとに変更される場合があります。必要な配慮がある場合は、来場前に主催者・施設へ直接確認してください。</p>

        <h2>外部サイト・広告</h2>
        <p>外部サイトの商品・サービス、契約、支払、個人情報取扱い等について、まちイベが提供主体でない限り、その内容を保証するものではありません。</p>

        <h2>保存データ</h2>
        <p>端末内に保存する「行きたい」「保存検索」等は、ブラウザ設定、データ削除、端末変更等により消失する場合があります。</p>

        <h2>責任の範囲</h2>
        <p>運営者の故意または重過失による場合、その他法令上責任を免れることができない場合を除き、本サービスの利用または利用不能から生じた損害について、運営者が当然にすべての責任を負うことを意味するものではありません。個別の責任範囲は適用法令に従います。</p>
      </section>
    </main>
  );
}
