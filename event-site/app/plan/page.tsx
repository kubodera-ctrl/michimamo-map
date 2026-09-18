import type { Metadata } from 'next';
import Link from 'next/link';
import { OutingPlanClient } from '@/components/OutingPlanClient';

export const metadata:Metadata={
  title:'おでかけプラン',
  description:'「行きたい」に保存したイベントを予定日ごとに整理。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/plan'}
};

export default function PlanPage() {
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>おでかけプラン</span></nav>
      <p className="eyebrow">OUTING PLAN</p>
      <h1>おでかけプラン</h1>
      <p className="area-copy">「行きたい」イベントの予定日を決めて、1日のおでかけ候補を日付順にまとめます。移動時間はまだ自動最適化せず、確定した事実だけを使います。</p>
      <div className="result-tools"><Link href="/saved">♡ 行きたい一覧</Link><Link href="/saved/map">🗺 地図で見る</Link></div>
      <OutingPlanClient />
    </main>
  );
}
