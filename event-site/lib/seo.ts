export const SITE_NAME = 'まちイベ';
export const SITE_DESCRIPTION =
  '全国のイベントを今日・明日・今週末、地域、子ども向け、無料、屋内、障害者向け配慮などから探せるイベント検索。';

export function siteUrl(path = '/') {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://events.example.jp';
  return new URL(path, base).toString();
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: siteUrl(item.path)
    }))
  };
}
