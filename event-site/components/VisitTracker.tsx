'use client';
import { useEffect } from 'react';
import { beginVisitSession } from '@/lib/client-prefs';
export function VisitTracker() {
  useEffect(()=>{ beginVisitSession(); },[]);
  return null;
}
