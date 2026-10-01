'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordMetric } from './MetricPing';

export function PageViewTracker(){
  const pathname=usePathname();
  const search=useSearchParams();
  const last=useRef('');
  useEffect(()=>{
    if(pathname.startsWith('/admin')) return;
    const key=pathname+'?'+search.toString();
    if(last.current===key) return;
    last.current=key;
    recordMetric('page_view');
  },[pathname,search]);
  return null;
}
