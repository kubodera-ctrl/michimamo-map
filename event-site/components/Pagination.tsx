import Link from 'next/link';
import {eventLabels} from '@/lib/event-labels';
import type {Locale} from '@/lib/i18n-config';

type Props = {
  basePath: string;
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  query?: Record<string,string | string[] | undefined>;
  locale?:Locale;
};

function buildHref(basePath:string, page:number, query:Record<string,string|string[]|undefined>) {
  const params=new URLSearchParams();
  for (const [key,value] of Object.entries(query)) {
    if(Array.isArray(value)){
      for(const item of value) if(item) params.append(key,item);
    } else if(value) params.set(key,value);
  }
  if (page > 1) params.set('page',String(page));
  const qs=params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({basePath,page,hasPrevious,hasNext,query={},locale='ja'}:Props) {
  const g=eventLabels(locale).generic;
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav className="pagination" aria-label={locale==='ja'?'検索結果のページ移動':'Search result pages'}>
      {hasPrevious ? (
        <Link href={buildHref(basePath,page-1,query)} rel="prev">{g.previousPage}</Link>
      ) : <span aria-hidden="true" />}
      <span className="pagination-current" aria-current="page">{locale==='ja'?`${page}${g.pageLabel}`:`${g.pageLabel} ${page}`}</span>
      {hasNext ? (
        <Link href={buildHref(basePath,page+1,query)} rel="next">{g.nextPage}</Link>
      ) : <span aria-hidden="true" />}
    </nav>
  );
}
