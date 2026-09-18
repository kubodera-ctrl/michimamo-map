import type { MetadataRoute } from 'next';
import { CATEGORY_OPTIONS, getEventSitemap, getPublicFacetSitemap, getPublicFandomSitemap } from '@/lib/events';
import { slugByPrefecture } from '@/lib/prefectures';
import { SEO_INTENTS, searchSeoIntentEvents } from '@/lib/seo-intents';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp';
  const [eventRows, fandomRows, facetRows, guideRows] = await Promise.all([
    getEventSitemap(),
    getPublicFandomSitemap(),
    getPublicFacetSitemap(),
    Promise.all(Object.keys(SEO_INTENTS).map(async (intent) => ({
      intent,
      count:(await searchSeoIntentEvents(intent,1,3)).events.length
    })))
  ]);

  const validCategories=new Set(CATEGORY_OPTIONS.map(([key])=>key));
  const areas=facetRows
    .filter((row)=>row.kind==='prefecture')
    .map((row)=>({row,slug:slugByPrefecture[row.key]}))
    .filter((entry)=>Boolean(entry.slug));
  const categories=facetRows.filter((row)=>row.kind==='category' && validCategories.has(row.key as never));

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...areas.map(({row,slug}) => ({
      url: `${base}/area/${slug}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8
    })),
    ...categories.map((row) => ({
      url: `${base}/category/${row.key}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8
    })),
    ...guideRows.filter((row)=>row.count>=3).map((row) => ({
      url: `${base}/guide/${row.intent}`,
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
