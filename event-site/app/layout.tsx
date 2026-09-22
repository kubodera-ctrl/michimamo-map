import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { SITE_DESCRIPTION, SITE_NAME, safeJsonLd, siteUrl } from '@/lib/seo';
import { normalizeGaMeasurementId } from '@/lib/analytics-config';
import { machimamoMapUrl, publicSiteBaseUrl, searchIndexingAllowed, xAccountUrl } from '@/lib/url-config';
import { PageViewTracker } from '@/components/PageViewTracker';
import { TrackedLink } from '@/components/TrackedLink';
import { BrandNav } from '@/components/BrandNav';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const allowIndexing=searchIndexingAllowed();
const gaId=normalizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export const metadata: Metadata = {
  applicationName: SITE_NAME,
  title:{default:'まちイベ｜全国の今日・週末イベント検索',template:'%s｜まちイベ'},
  description:SITE_DESCRIPTION,
  icons:{icon:'/machiibe-icon.svg',shortcut:'/machiibe-icon.svg',apple:'/machiibe-icon.svg'},
  manifest:'/manifest.webmanifest',
  metadataBase:new URL(publicSiteBaseUrl()),
  alternates:{canonical:'/'},
  openGraph:{type:'website',siteName:SITE_NAME,title:'まちイベ｜全国の今日・週末イベント検索',description:SITE_DESCRIPTION,url:'/'},
  twitter:{card:'summary_large_image',title:'まちイベ｜全国の今日・週末イベント検索',description:SITE_DESCRIPTION,site:'@machiibe01',creator:'@machiibe01'},
  robots:allowIndexing?{index:true,follow:true}:{index:false,follow:false},
  verification:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?{google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}:undefined
};

const websiteJsonLd={'@context':'https://schema.org','@type':'WebSite',name:SITE_NAME,alternateName:'まちイベ by まちまも',url:siteUrl('/'),inLanguage:'ja-JP',description:SITE_DESCRIPTION,publisher:{'@type':'Organization',name:'SUMION合同会社',sameAs:[xAccountUrl()]}};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="machiibe-ga" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}', { anonymize_ip: true, send_page_view: false });
            `}</Script>
          </>
        )}
        <Suspense fallback={null}><PageViewTracker /></Suspense>
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(websiteJsonLd)}} />
        <header className="site-header">
          <div className="header-inner">
            <BrandNav />
            <nav className="header-actions" aria-label="ユーザーメニュー">
              <Link className="header-mini-link" href="/saved">♡ 行きたい</Link>
              <Link className="header-mini-link" href="/saved-searches">☆ 保存検索</Link>
              <Link className="header-mini-link" href="/plan">📅 予定</Link>
              <TrackedLink className="map-link" href={machimamoMapUrl()} metric="machimamo_map">まちまもMAP</TrackedLink>
            </nav>
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          <div><strong>まちイベ</strong><p>掲載内容は変更される場合があります。来場前に必ず主催者・公式サイトの最新情報をご確認ください。</p></div>
          <div className="footer-links"><Link href="/partners">まちイベについて</Link><Link href="/policies">ポリシー・規約</Link><Link href="/terms">利用規約</Link><Link href="/privacy">プライバシー</Link><Link href="/corrections">訂正・掲載停止</Link><Link href="/operator">運営者情報</Link><Link href="/saved">行きたい一覧</Link><a href={xAccountUrl()} target="_blank" rel="me noreferrer">𝕏 @machiibe01</a><TrackedLink href={machimamoMapUrl()} metric="machimamo_map">周辺の安全情報を見る</TrackedLink></div>
        </footer>
      </body>
    </html>
  );
}
