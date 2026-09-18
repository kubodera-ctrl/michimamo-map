import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'まちまもイベント｜全国の今日・週末イベント検索',
    template: '%s｜まちまもイベント'
  },
  description: '全国のイベントを今日・明日・今週末、地域、子ども向け、無料、屋内などから探せるイベント検索。イベント先の周辺安全情報はまちまもMAPへ。',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp')
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <span className="brand-mark">ま</span>
              <span><strong>まちまもイベント</strong><small>全国のおでかけを、もっと見つけやすく。</small></span>
            </Link>
            <a className="map-link" href={process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL || 'https://machimamo-map.vercel.app'}>
              まちまもMAP
            </a>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>まちまもイベント</strong>
            <p>掲載内容は変更される場合があります。来場前に必ず主催者・公式サイトの最新情報をご確認ください。</p>
          </div>
          <a href={process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL || 'https://machimamo-map.vercel.app'}>周辺の安全情報を見る</a>
        </footer>
      </body>
    </html>
  );
}
