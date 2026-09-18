import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  applicationName: SITE_NAME,
  title:{default:'まちイベ｜全国の今日・週末イベント検索',template:'%s｜まちイベ'},
  description:SITE_DESCRIPTION,
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp'),
  alternates:{canonical:'/'},
  openGraph:{type:'website',siteName:SITE_NAME,title:'まちイベ｜全国の今日・週末イベント検索',description:SITE_DESCRIPTION,url:'/'},
  twitter:{card:'summary_large_image',title:'まちイベ｜全国の今日・週末イベント検索',description:SITE_DESCRIPTION},
  robots:{index:true,follow:true},
  verification:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?{google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}:undefined
};

const websiteJsonLd={'@context':'https://schema.org','@type':'WebSite',name:SITE_NAME,alternateName:'まちイベ by まちまも',url:siteUrl('/'),inLanguage:'ja-JP',description:SITE_DESCRIPTION,publisher:{'@type':'Organization',name:'SUMION合同会社'}};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
            <Script id="machiibe-ga" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', { anonymize_ip: true });
            `}</Script>
          </>
        )}
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteJsonLd)}} />
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand"><span className="brand-mark">ま</span><span><strong>まちイベ</strong><small>by まちまも｜全国のおでかけを、もっと見つけやすく。</small></span></Link>
            <nav className="header-actions" aria-label="ユーザーメニュー">
              <Link className="header-mini-link" href="/saved">♡ 行きたい</Link>
              <Link className="header-mini-link" href="/saved-searches">☆ 保存検索</Link>
              <a className="map-link" href={process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL || 'https://machimamo-map.vercel.app'}>まちまもMAP</a>
            </nav>
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          <div><strong>まちイベ</strong><p>掲載内容は変更される場合があります。来場前に必ず主催者・公式サイトの最新情報をご確認ください。</p></div>
          <div className="footer-links"><Link href="/corrections">掲載情報の訂正</Link><Link href="/privacy">プライバシー</Link><Link href="/saved">行きたい一覧</Link><a href={process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL || 'https://machimamo-map.vercel.app'}>周辺の安全情報を見る</a></div>
        </footer>
      </body>
    </html>
  );
}
