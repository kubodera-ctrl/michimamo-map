'use client';

import { useEffect, useState } from 'react';
import { EventCard } from './EventCard';
import { getEventsBySlugs } from '@/lib/events';
import { PREF_KEYS, readStringArray } from '@/lib/client-prefs';
import type { EventSummary } from '@/lib/types';

export function SavedEventsClient() {
  const [events,setEvents]=useState<EventSummary[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const slugs=readStringArray(PREF_KEYS.savedEvents);
      const rows=await getEventsBySlugs(slugs);
      if(!cancelled){ setEvents(rows); setLoading(false); }
    };
    void load();
    const sync=()=>{ void load(); };
    window.addEventListener('machiibe:prefs',sync);
    return ()=>{cancelled=true;window.removeEventListener('machiibe:prefs',sync);};
  },[]);

  if(loading) return <div className="empty-state"><p>行きたいイベントを読み込んでいます…</p></div>;
  if(!events.length) return <div className="empty-state"><h2>「行きたい」はまだありません</h2><p>イベント詳細の♡から保存すると、ここでまとめて確認できます。</p></div>;

  return <div className="event-grid">{events.map((event)=><EventCard key={event.id} event={event} respectHidden={false} />)}</div>;
}
