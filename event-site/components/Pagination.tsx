import Link from 'next/link';

type Props = {
  basePath: string;
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  query?: Record<string,string | undefined>;
};

function buildHref(basePath:string, page:number, query:Record<string,string|undefined>) {
  const params=new URLSearchParams();
  for (const [key,value] of Object.entries(query)) {
    if (value) params.set(key,value);
  }
  if (page > 1) params.set('page',String(page));
  const qs=params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({basePath,page,hasPrevious,hasNext,query={}}:Props) {
  if (!hasPrevious && !hasNext) return null;
  return (
    <nav className="pagination" aria-label="検索結果のページ移動">
      {hasPrevious ? (
        <Link href={buildHref(basePath,page-1,query)} rel="prev">← 前のページ</Link>
      ) : <span aria-hidden="true" />}
      <span className="pagination-current" aria-current="page">{page}ページ目</span>
      {hasNext ? (
        <Link href={buildHref(basePath,page+1,query)} rel="next">次のページ →</Link>
      ) : <span aria-hidden="true" />}
    </nav>
  );
}
