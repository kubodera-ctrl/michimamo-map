'use client';

import { useEffect, useState } from 'react';
import { getPreviousVisit } from '@/lib/client-prefs';

export function NewSinceLastVisitLink({active}:{active:boolean}) {
  const [href,setHref]=useState<string|null>(null);
  useEffect(()=>{
    const url=new URL(window.location.href);
    url.searchParams.delete('page');
    if(active) {
      url.searchParams.delete('since');
      setHref(url.pathname+(url.searchParams.toString()?`?${url.searchParams.toString()}`:''));
      return;
    }
    const previous=getPreviousVisit();
    if(!previous) return;
    url.searchParams.set('since',previous);
    setHref(url.pathname+`?${url.searchParams.toString()}`);
  },[active]);
  if(!href) return null;
  return <a className={`new-since-link ${active?'active':''}`} href={href}>{active?'新着だけ表示を解除':'前回訪問後の新着だけ'}</a>;
}
