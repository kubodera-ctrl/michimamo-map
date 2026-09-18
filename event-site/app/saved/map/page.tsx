import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedEventsMapClient } from '@/components/SavedEventsMapClient';

export const metadata:Metadata={
  title:'行きたいイベントの地図',
  description:'まちイベで「行きたい」に保存したイベント会場を地図で確認。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/saved/map'}
};

export default function SavedMapPage() {
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><Link href="/saved">保存したイベント</Link><span>›</span><span>地図</span></nav>
      <p className="eyebrow">SAVED MAP</p>
      <h1>行きたいイベントを地図で見る</h1>
      <p className="area-copy">会場位置を確認できたイベントだけを表示します。位置精度が不十分なイベントは誤案内防止のため地図に出しません。</p>
      <SavedEventsMapClient />
    </main>
  );
}
