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
        <h3>よく探される条件</h3>
        <div className="seo-link-grid">
          <Link href="/guide/today-kanto-family">今日・関東・子連れ</Link>
          <Link href="/guide/tomorrow-kanto-family">明日・関東・子連れ</Link>
          <Link href="/guide/today-indoor-family">今日・室内・子連れ</Link>
          <Link href="/guide/tomorrow-indoor-family">明日・室内・子連れ</Link>
        </div>
      </div>

      <div className="seo-browse-block">
        <h3>推し活から探す</h3>
        <div className="seo-link-grid">
          <Link href="/oshi/chiikawa">ちいかわ</Link>
          <Link href="/oshi/detective-conan">名探偵コナン</Link>
          <Link href="/oshi/sumikkogurashi">すみっコぐらし</Link>
          <Link href="/oshi/aipri">アイプリ</Link>
          <Link href="/oshi/precure">プリキュア</Link>
          <Link href="/oshi/kamen-rider">仮面ライダー</Link>
          <Link href="/oshi/hayao-miyazaki">宮崎駿</Link>
          <Link href="/oshi/ghibli">ジブリ</Link>
          <Link href="/oshi/pixar">ピクサー</Link>
        </div>
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
