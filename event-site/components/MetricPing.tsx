'use client';

import { useEffect } from 'react';
import { getPublicSupabase } from '@/lib/supabase';

export async function recordMetric(metric:string,eventSlug?:string) {
  const db=getPublicSupabase();
  if (!db) return;
  try {
    await db.rpc('record_public_metric',{
      p_metric:metric,
      p_event_slug:eventSlug || null
    });
  } catch {
    // Metrics must never break user actions.
  }
}

export function MetricPing({metric,eventSlug}:{metric:string;eventSlug?:string}) {
  useEffect(() => {
    void recordMetric(metric,eventSlug);
  },[metric,eventSlug]);
  return null;
}
