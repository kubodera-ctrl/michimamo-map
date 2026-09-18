import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedEventsClient } from '@/components/SavedEventsClient';

export const metadata:Metadata={
  title:'行きたいイベント',
  description:'まちイベで「行きたい」に保存したイベント一覧。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/saved'}
};

export default function SavedPage() {
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>行きたい</span></nav>
      <p className="eyebrow">SAVED</p>
      <h1>行きたいイベント</h1>
      <p className="area-copy">この端末に保存したイベントです。開催終了後も確認できますが、来場前に公式情報をご確認ください。</p>
      <SavedEventsClient />
    </main>
  );
}
