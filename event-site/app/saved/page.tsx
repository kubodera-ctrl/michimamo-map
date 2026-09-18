import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedEventsClient } from '@/components/SavedEventsClient';

export const metadata:Metadata={
  title:'行きたい・行ったイベント',
  description:'まちイベで保存した「行きたい」「行った」イベント一覧。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/saved'}
};

export default function SavedPage() {
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>保存したイベント</span></nav>
      <p className="eyebrow">SAVED</p>
      <h1>保存したイベント</h1>
      <p className="area-copy">この端末に保存しています。来場前は必ず公式情報をご確認ください。</p>
      <section className="saved-section"><h2>♡ 行きたい</h2><SavedEventsClient mode="saved" /></section>
      <section className="saved-section"><h2>✓ 行った</h2><SavedEventsClient mode="attended" /></section>
    </main>
  );
}
