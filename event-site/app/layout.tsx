import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { SITE_NAME, safeJsonLd, siteUrl } from '@/lib/seo';
import { normalizeGaMeasurementId } from '@/lib/analytics-config';
import { machimamoMapUrl, publicSiteBaseUrl, searchIndexingAllowed, xAccountUrl } from '@/lib/url-config';
import { PageViewTracker } from '@/components/PageViewTracker';
import { TrackedLink } from '@/components/TrackedLink';
import { BrandNav } from '@/components/BrandNav';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getRequestLocale } from '@/lib/i18n-server';
import { getMessages } from '@/lib/i18n';
import { HTML_LANG, localePath } from '@/lib/i18n-config';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const allowIndexing=searchIndexingAllowed();
const gaId=normalizeGaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export async function generateMetadata():Promise<Metadata>{
  const locale=await getRequestLocale();
  const messages=getMessages(locale);
  const canonical=localePath('/',locale);
  return {
    applicationName:SITE_NAME,
    title:{default:messages.homeTitle,template:`%s｜${SITE_NAME}`},
    description:messages.homeDescription,
    icons:{icon:'/machiibe-icon.svg',shortcut:'/machiibe-icon.svg',apple:'/machiibe-icon.svg'},
    manifest:'/manifest.webmanifest',
    metadataBase:new URL(publicSiteBaseUrl()),
    alternates:{
      canonical,
      languages:{
        'ja-JP':'/',
        en:'/en',
        'zh-Hans':'/zh-cn',
        'zh-Hant':'/zh-tw',
        ko:'/ko',
        'x-default':'/'
      }
    },
    openGraph:{type:'website',siteName:SITE_NAME,title:messages.homeTitle,description:messages.homeDescription,url:canonical},
    twitter:{card:'summary_large_image',title:messages.homeTitle,description:messages.homeDescription,site:'@machiibe01',creator:'@machiibe01'},
    robots:allowIndexing?{index:true,follow:true}:{index:false,follow:false},
    verification:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?{google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}:undefined
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale=await getRequestLocale();
  const messages=getMessages(locale);
  const machimamoUrl=new URL(machimamoMapUrl());
  machimamoUrl.searchParams.set('from','machiibe');
  const websiteJsonLd={
    '@context':'https://schema.org',
    '@type':'WebSite',
    name:SITE_NAME,
    alternateName:'まちイベ by まちまも',
    url:siteUrl(localePath('/',locale)),
    inLanguage:HTML_LANG[locale],
    description:messages.homeDescription,
    publisher:{'@type':'Organization',name:'SUMION合同会社',sameAs:[xAccountUrl()]}
  };
  return (
    <html lang={HTML_LANG[locale]}>
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
        <a className="skip-link" href="#main-content">{messages.skipToContent}</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(websiteJsonLd)}} />
        <header className="site-header">
          <div className="header-inner">
            <BrandNav locale={locale} tagline={messages.brandTagline} />
            <nav className="header-actions" aria-label={messages.userMenu}>
              <Link className="header-mini-link" href={localePath('/saved',locale)}>{messages.saved}</Link>
              <Link className="header-mini-link" href={localePath('/saved-searches',locale)}>{messages.savedSearches}</Link>
              <Link className="header-mini-link" href={localePath('/plan',locale)}>{messages.plan}</Link>
              <LanguageSwitcher locale={locale} label={messages.language} />
              <TrackedLink className="map-link" href={machimamoUrl.toString()} metric="machimamo_map">{messages.safeMap}</TrackedLink>
            </nav>
          </div>
        </header>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          <div><strong>まちイベ</strong><p>{messages.footerNotice}</p>{locale!=='ja' && <p className="translation-notice">{messages.translationNotice}</p>}</div>
          <div className="footer-links">
            <Link href={localePath('/partners',locale)}>{messages.about}</Link>
            <Link href={localePath('/policies',locale)}>{messages.policies}</Link>
            <Link href={localePath('/terms',locale)}>{messages.terms}</Link>
            <Link href={localePath('/privacy',locale)}>{messages.privacy}</Link>
            <Link href={localePath('/corrections',locale)}>{messages.corrections}</Link>
            <Link href={localePath('/operator',locale)}>{messages.operator}</Link>
            <Link href={localePath('/saved',locale)}>{messages.savedList}</Link>
            <a href={xAccountUrl()} target="_blank" rel="me noreferrer">𝕏 @machiibe01</a>
            <TrackedLink href={machimamoUrl.toString()} metric="machimamo_map">{messages.safeInfo}</TrackedLink>
          </div>
        </footer>
      </body>
    </html>
  );
}
