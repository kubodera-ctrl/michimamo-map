'use client';

import { useEffect, useState } from 'react';
import { getPreviousVisit } from '@/lib/client-prefs';
import {eventLabels} from '@/lib/event-labels';
import type {Locale} from '@/lib/i18n-config';

export function NewSinceLastVisitLink({active,locale='ja'}:{active:boolean;locale?:Locale}) {
  const g=eventLabels(locale).generic;
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
  return <a className={`new-since-link ${active?'active':''}`} href={href}>{active?g.clearNewOnly:g.newOnly}</a>;
}
