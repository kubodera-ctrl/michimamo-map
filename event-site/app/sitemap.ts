import type { MetadataRoute } from 'next';
import { CATEGORY_OPTIONS, getEventSitemap, getPublicFandomSitemap } from '@/lib/events';
import { PREFECTURES } from '@/lib/prefectures';
import { SEO_INTENTS } from '@/lib/seo-intents';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp';
  const [eventRows, fandomRows] = await Promise.all([getEventSitemap(), getPublicFandomSitemap()]);
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...PREFECTURES.map(([slug]) => ({
      url: `${base}/area/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8
    })),
    ...CATEGORY_OPTIONS.map(([key]) => ({
      url: `${base}/category/${key}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8
    })),
    ...Object.keys(SEO_INTENTS).map((intent) => ({
      url: `${base}/guide/${intent}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85
    })),
    ...fandomRows.map((row) => ({
      url: `${base}/oshi/${row.slug}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8
    })),
    ...eventRows.map((row) => ({
      url: `${base}/events/${row.slug}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.7
    }))
  ];
}
