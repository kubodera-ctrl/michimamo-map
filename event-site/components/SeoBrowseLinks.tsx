import Link from 'next/link';
import { CATEGORY_OPTIONS } from '@/lib/events';
import { PREFECTURES } from '@/lib/prefectures';

export function SeoBrowseLinks() {
  return (
    <section className="seo-browse" aria-labelledby="seo-browse-title">
      <div className="seo-browse-heading">
        <p className="eyebrow">BROWSE</p>
        <h2 id="seo-browse-title">地域・カテゴリからイベントを探す</h2>
        <p>検索条件の組み合わせを大量ページ化せず、役に立つ地域・カテゴリページを中心に案内します。</p>
      </div>

      <div className="seo-browse-block">
        <h3>カテゴリ</h3>
        <div className="seo-link-grid seo-category-links">
          {CATEGORY_OPTIONS.map(([key,label]) => (
            <Link key={key} href={`/category/${key}`}>{label}</Link>
          ))}
        </div>
      </div>

      <details className="seo-browse-block seo-area-details">
        <summary>47都道府県から探す</summary>
        <div className="seo-link-grid seo-area-links">
          {PREFECTURES.map(([slug,name]) => (
            <Link key={slug} href={`/area/${slug}`}>{name}</Link>
          ))}
        </div>
      </details>
    </section>
  );
}
