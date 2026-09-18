'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function recordMetric(metric:string,eventSlug?:string,searchTerm?:string) {
  if (typeof window === 'undefined') return;

  try {
    void fetch('/api/analytics/track',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({metric,eventSlug,searchTerm}),
      keepalive:true,
      credentials:'same-origin'
    });
  } catch {}

  if(typeof window.gtag==='function'){
    try{
      window.gtag('event',metric,{
        event_slug:eventSlug || undefined,
        search_term:searchTerm || undefined,
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
