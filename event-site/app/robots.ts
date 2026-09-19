import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp';
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true'
    && Boolean(process.env.NEXT_PUBLIC_SITE_URL);

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
