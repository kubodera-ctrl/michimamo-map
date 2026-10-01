import type { MetadataRoute } from 'next';
import { publicSiteBaseUrl, searchIndexingAllowed } from '@/lib/url-config';

export default function robots(): MetadataRoute.Robots {
  const base = publicSiteBaseUrl().replace(/\/$/,'');
  const allowIndexing = searchIndexingAllowed();

  if (!allowIndexing) {
    return {
      rules: { userAgent: '*', disallow: '/' }
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/','/admin/']
    },
    sitemap: `${base}/sitemap.xml`
  };
}
