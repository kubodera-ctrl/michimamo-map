import type { MetadataRoute } from 'next';
import { getEventSitemap } from '@/lib/events';
import { PREFECTURES } from '@/lib/prefectures';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp';
  const eventRows = await getEventSitemap();
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...PREFECTURES.map(([slug]) => ({
      url: `${base}/area/${slug}`,
      lastModified: new Date(),
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
