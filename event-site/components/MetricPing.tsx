'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sanitizedPageUrl(value:string){
  try{
    const url=new URL(value,window.location.origin);
    return url.origin+url.pathname;
  }catch{
    return window.location.origin+window.location.pathname;
  }
}

function sanitizeSearchTerm(value:string|undefined){
  const term=(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,80);
  if(!term) return '';
  if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(term)) return '';
  if(/\d{8,}/.test(term.replace(/[\s-]/g,''))) return '';
  return term;
}

export function recordMetric(metric:string,eventSlug?:string,searchTerm?:string) {
  if (typeof window === 'undefined') return;

  if(metric==='event_view' && eventSlug){
    const key=`machiibe_metric_event_view_${eventSlug}`;
    try{
      if(sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key,'1');
    }catch{}
  }

  try {
    void fetch('/api/analytics/track',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({metric,eventSlug,searchTerm:sanitizeSearchTerm(searchTerm)||undefined}),
      keepalive:true,
      credentials:'same-origin'
    });
  } catch {}

  if(typeof window.gtag==='function'){
    try{
      window.gtag('event',metric,{
        event_slug:eventSlug || undefined,
        page_location:sanitizedPageUrl(window.location.href),
        page_referrer:document.referrer ? sanitizedPageUrl(document.referrer) : undefined,
        send_to:process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined
      });
    }catch{}
  }
}

export function MetricPing({metric,eventSlug,searchTerm}:{metric:string;eventSlug?:string;searchTerm?:string}) {
  useEffect(() => {
    recordMetric(metric,eventSlug,searchTerm);
  },[metric,eventSlug,searchTerm]);
  return null;
}
