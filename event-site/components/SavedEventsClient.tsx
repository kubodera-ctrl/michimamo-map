'use client';

import { useEffect, useState } from 'react';
import { EventCard } from './EventCard';
import { getEventsBySlugs } from '@/lib/events';
import { PREF_KEYS, readStringArray } from '@/lib/client-prefs';
import type { EventSummary } from '@/lib/types';

type Mode='saved'|'attended';

export function SavedEventsClient({mode}:{mode:Mode}) {
  const [events,setEvents]=useState<EventSummary[]>([]);
  const [missingCount,setMissingCount]=useState(0);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const key=mode==='saved'?PREF_KEYS.savedEvents:PREF_KEYS.attendedEvents;
      const slugs=readStringArray(key);
      const rows=await getEventsBySlugs(slugs);
      if(!cancelled){
        setEvents(rows);
        setMissingCount(Math.max(0,slugs.length-rows.length));
        setLoading(false);
      }
    };
    void load();
    const sync=()=>{ void load(); };
    window.addEventListener('machiibe:prefs',sync);
    return ()=>{cancelled=true;window.removeEventListener('machiibe:prefs',sync);};
  },[mode]);

  const label=mode==='saved'?'「行きたい」':'「行った」';
  if(loading) return <div className="empty-state"><p>{label}イベントを読み込んでいます…</p></div>;
  if(!events.length && !missingCount) return <div className="empty-state"><h2>{label}はまだありません</h2><p>イベント詳細から保存すると、ここでまとめて確認できます。</p></div>;

  return (
    <>
      {missingCount>0 && <div className="history-note">{missingCount}件は掲載終了・非公開などのため詳細を現在表示できません。</div>}
      <div className="event-grid">{events.map((event)=><EventCard key={event.id} event={event} respectHidden={false} />)}</div>
    </>
  );
}
