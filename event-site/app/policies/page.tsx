import type {Metadata} from 'next';
import Link from 'next/link';
import {POLICY_UPDATED,publicPolicyRobots} from '@/lib/policy';

export const metadata:Metadata={
  title:'ポリシー・規約',
  description:'まちイベの利用規約、プライバシー、イベント情報、広告、著作権、免責、アクセシビリティ等の方針。',
  robots:publicPolicyRobots(),
  alternates:{canonical:'/policies'}
};

const policies=[
  {href:'/terms',title:'利用規約',body:'まちイベを利用する際の基本ルール、禁止事項、外部サービス、知的財産、変更・停止等。'},
  {href:'/privacy',title:'プライバシーポリシー',body:'端末保存、アクセス解析、Cookie・問い合わせ情報、保存期間、安全管理等。'},
  {href:'/external-transmission',title:'外部送信について',body:'Google Analytics、Supabase、OpenStreetMap等への外部通信と利用目的。'},
  {href:'/data-policy',title:'イベント情報・データポリシー',body:'情報源、API・RSS・公式URL、確認・自動更新・重複統合・公開基準・画像利用等。'},
  {href:'/advertising-policy',title:'広告・アフィリエイトポリシー',body:'PR・広告表示、ASPリンク、スポンサー枠と通常検索結果の分離、編集方針。'},
  {href:'/copyright',title:'著作権・商標・リンク方針',body:'まちイベ独自コンテンツ、第三者の名称・画像・ロゴ、引用、リンクに関する方針。'},
  {href:'/disclaimer',title:'免責事項',body:'開催変更、料金・在庫・予約、外部サービス、交通・天候・安全情報等に関する注意事項。'},
  {href:'/accessibility',title:'アクセシビリティ方針',body:'年齢や障害の有無にかかわらず使いやすい検索・表示を目指すための改善方針。'},
  {href:'/corrections',title:'訂正・掲載停止方針',body:'主催者・施設・権利者・利用者からの訂正、掲載停止、権利侵害申告への対応。'},
  {href:'/operator',title:'運営者情報',body:'まちイベの運営主体、サービス状況、問い合わせ・連絡窓口。'}
] as const;

export default function PoliciesPage(){
  return (
    <main className="content-wrap legal-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>ポリシー・規約</span></nav>
      <p className="eyebrow">POLICY CENTER</p>
      <h1>ポリシー・規約</h1>
      <p className="legal-lead">
        「まちイベ」は、イベント情報を見つけやすくするだけでなく、
        情報源・広告・個人情報・権利関係・訂正対応を分けて管理します。
        現在はβ公開準備中のため、運用開始前に内容を最終確認し、必要に応じて更新します。
      </p>
      <p className="policy-updated">最終更新：{POLICY_UPDATED}</p>
      <div className="policy-index-grid">
        {policies.map((item)=>(
          <Link href={item.href} className="policy-index-card" key={item.href}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <span>確認する →</span>
          </Link>
        ))}
      </div>
      <section className="policy-card policy-note">
        <h2>販売機能について</h2>
        <p>現在のまちイベ自体はイベント検索・おでかけ支援サービスであり、まちイベ上でイベントチケット等を直接販売する機能はありません。将来、まちイベ自身が有償商品・役務を販売する場合は、その開始前に必要な表示・規約を追加します。</p>
      </section>
    </main>
  );
}
