'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function recordMetric(metric:string,eventSlug?:string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag('event',metric,{
      event_slug:eventSlug || undefined,
      send_to:process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || undefined
    });
  } catch {
    // Analytics must never break user actions.
  }
}

export function MetricPing({metric,eventSlug}:{metric:string;eventSlug?:string}) {
  useEffect(() => {
    recordMetric(metric,eventSlug);
  },[metric,eventSlug]);
  return null;
}
