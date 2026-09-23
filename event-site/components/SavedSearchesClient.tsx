'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { deleteSavedSearch, readSavedSearches, type SavedSearch } from '@/lib/client-prefs';
import {localePath,type Locale} from '@/lib/i18n-config';

const copy:Record<Locale,{emptyTitle:string;emptyCopy:string;use:string;delete:string}>={
  ja:{emptyTitle:'保存した検索はまだありません',emptyCopy:'検索画面の「☆ この検索条件を保存」から、よく使う条件を最大20件まで保存できます。',use:'この条件で検索する →',delete:'削除'},
  en:{emptyTitle:'No saved searches yet',emptyCopy:'Use “☆ Save these filters” on the search page to keep up to 20 frequently used searches.',use:'Search with these filters →',delete:'Delete'},
  'zh-cn':{emptyTitle:'还没有已保存搜索',emptyCopy:'可在搜索页面使用“☆ 保存此搜索条件”，最多保存20组常用条件。',use:'按此条件搜索 →',delete:'删除'},
  'zh-tw':{emptyTitle:'還沒有已儲存搜尋',emptyCopy:'可在搜尋頁面使用「☆ 儲存此搜尋條件」，最多儲存20組常用條件。',use:'依此條件搜尋 →',delete:'刪除'},
  ko:{emptyTitle:'저장한 검색이 아직 없습니다',emptyCopy:'검색 화면의 「☆ 이 검색 조건 저장」에서 자주 쓰는 조건을 최대 20개까지 저장할 수 있습니다.',use:'이 조건으로 검색 →',delete:'삭제'}
};

export function SavedSearchesClient({locale='ja'}:{locale?:Locale}) {
  const [items,setItems]=useState<SavedSearch[]>([]);
  const t=copy[locale] || copy.ja;

  useEffect(()=>{
    const sync=()=>setItems(readSavedSearches());
    sync();
    window.addEventListener('machiibe:prefs',sync);
    return ()=>window.removeEventListener('machiibe:prefs',sync);
  },[]);

  if(!items.length) {
    return <div className="empty-state"><h2>{t.emptyTitle}</h2><p>{t.emptyCopy}</p></div>;
  }

  return (
    <div className="saved-search-list">
      {items.map((item)=>{
        const raw=item.url || '/';
        let href=raw;
        try{
          const url=new URL(raw,'https://machiibe.invalid');
          href=localePath(url.pathname,locale)+(url.search||'');
        }catch{
          href=localePath('/',locale);
        }
        return (
          <article className="saved-search-item" key={item.id}>
            <Link href={href}><strong>{item.label}</strong><span>{t.use}</span></Link>
            <button type="button" onClick={()=>deleteSavedSearch(item.id)}>{t.delete}</button>
          </article>
        );
      })}
    </div>
  );
}
