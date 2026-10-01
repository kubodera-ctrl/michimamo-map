import { publicSiteBaseUrl } from './url-config';

export const SITE_NAME = 'まちイベ';
export const SITE_DESCRIPTION =
  '全国のイベントを今日・明日・今週末、地域、子ども向け、無料、屋内、障害者向け配慮などから探せるイベント検索。';

export function siteUrl(path = '/') {
  return new URL(path, publicSiteBaseUrl()).toString();
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


export function safeJsonLd(value:unknown) {
  return JSON.stringify(value)
    .replace(/</g,'\\u003c')
    .replace(/>/g,'\\u003e')
    .replace(/&/g,'\\u0026')
    .replace(/\u2028/g,'\\u2028')
    .replace(/\u2029/g,'\\u2029');
}
