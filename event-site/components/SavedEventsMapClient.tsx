'use client';

import { useEffect, useRef, useState } from 'react';
import { getEventsBySlugs, isTrustedLocation } from '@/lib/events';
import { PREF_KEYS, readStringArray } from '@/lib/client-prefs';
import type { EventDetail } from '@/lib/types';

export function SavedEventsMapClient() {
  const elRef=useRef<HTMLDivElement|null>(null);
  const mapRef=useRef<{remove:()=>void}|null>(null);
  const [events,setEvents]=useState<EventDetail[]>([]);
  const [loading,setLoading]=useState(true);
  const [omitted,setOmitted]=useState(0);

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const rows=await getEventsBySlugs(readStringArray(PREF_KEYS.savedEvents));
      if(!cancelled){setEvents(rows);setLoading(false);}
    };
    void load();
    const sync=()=>{void load();};
    window.addEventListener('machiibe:prefs',sync);
    return ()=>{cancelled=true;window.removeEventListener('machiibe:prefs',sync);};
  },[]);

  useEffect(()=>{
    let cancelled=false;
    if(loading || !elRef.current) return;
    mapRef.current?.remove();
    mapRef.current=null;

    const points=events.filter(isTrustedLocation);
    setOmitted(events.length-points.length);
    if(!points.length) return;

    void (async()=>{
      const L=await import('leaflet');
      if(cancelled || !elRef.current) return;

      const map=L.map(elRef.current,{zoomControl:true,attributionControl:true});
      mapRef.current=map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19,
        attribution:'&copy; OpenStreetMap contributors'
      }).addTo(map);

      const bounds:Array<[number,number]>=[];
      for(const event of points){
        const lat=event.latitude as number;
        const lng=event.longitude as number;
        bounds.push([lat,lng]);
        const marker=L.circleMarker([lat,lng],{
          radius:8,weight:2,fillOpacity:.8
        }).addTo(map);
        const node=document.createElement('div');
        const title=document.createElement('strong');
        title.textContent=event.title;
        node.appendChild(title);
        const br=document.createElement('br');
        node.appendChild(br);
        const detail=document.createElement('a');
        detail.href=`/events/${event.slug}`;
        detail.textContent='詳細を見る';
        node.appendChild(detail);
        marker.bindPopup(node);
      }
      if(bounds.length===1) map.setView(bounds[0],15);
      else map.fitBounds(L.latLngBounds(bounds),{padding:[28,28]});
    })();

    return ()=>{
      cancelled=true;
      mapRef.current?.remove();
      mapRef.current=null;
    };
  },[events,loading]);

  if(loading) return <div className="empty-state"><p>地図を準備しています…</p></div>;
  if(!events.length) return <div className="empty-state"><h2>「行きたい」はまだありません</h2><p>イベントを保存すると、会場位置をまとめて確認できます。</p></div>;

  const mapped=events.length-omitted;
  if(!mapped) return <div className="empty-state"><h2>地図表示できる会場がありません</h2><p>位置確認済みのイベントだけを安全に地図へ表示します。</p></div>;

  return (
    <>
      {omitted>0 && <div className="history-note">{omitted}件は会場位置が未確認のため地図から除外しています。</div>}
      <div ref={elRef} className="saved-events-map" aria-label="行きたいイベントの会場地図" />
    </>
  );
}
