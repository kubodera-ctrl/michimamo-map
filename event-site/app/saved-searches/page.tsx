import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedSearchesClient } from '@/components/SavedSearchesClient';

export const metadata:Metadata={
  title:'保存した検索',
  description:'まちイベで保存した検索条件。',
  robots:{index:false,follow:true},
  alternates:{canonical:'/saved-searches'}
};

export default function SavedSearchesPage() {
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/">まちイベ</Link><span>›</span><span>保存した検索</span></nav>
      <p className="eyebrow">SAVED SEARCH</p>
      <h1>保存した検索</h1>
      <p className="area-copy">よく使う条件をこの端末に保存しています。ログイン不要で使えます。</p>
      <SavedSearchesClient />
    </main>
  );
}
