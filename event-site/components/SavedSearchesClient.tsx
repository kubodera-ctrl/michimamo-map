'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { deleteSavedSearch, readSavedSearches, type SavedSearch } from '@/lib/client-prefs';

export function SavedSearchesClient() {
  const [items,setItems]=useState<SavedSearch[]>([]);

  useEffect(()=>{
    const sync=()=>setItems(readSavedSearches());
    sync();
    window.addEventListener('machiibe:prefs',sync);
    return ()=>window.removeEventListener('machiibe:prefs',sync);
  },[]);

  if(!items.length) {
    return <div className="empty-state"><h2>保存した検索はまだありません</h2><p>検索画面の「☆ この検索条件を保存」から、よく使う条件を最大20件まで保存できます。</p></div>;
  }

  return (
    <div className="saved-search-list">
      {items.map((item)=>(
        <article className="saved-search-item" key={item.id}>
          <Link href={item.url}><strong>{item.label}</strong><span>この条件で検索する →</span></Link>
          <button type="button" onClick={()=>deleteSavedSearch(item.id)}>削除</button>
        </article>
      ))}
    </div>
  );
}
