'use client';

import { useEffect, useMemo, useState } from 'react';
import { PREF_KEYS, readStringArray, toggleInArray } from '@/lib/client-prefs';
import { recordMetric } from './MetricPing';

type Props = {
  event: {
    slug: string;
    title: string;
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    venueName: string | null;
    address: string;
    latitude: number | null;
    longitude: number | null;
    officialUrl: string;
  };
};

function addDays(date: string, days: number) {
  const [y,m,d] = date.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);
}

export function EventActions({ event }: Props) {
  const [saved, setSaved] = useState(false);
  const [attended,setAttended]=useState(false);

  useEffect(() => {
    const sync=()=>{
      setSaved(readStringArray(PREF_KEYS.savedEvents).includes(event.slug));
      setAttended(readStringArray(PREF_KEYS.attendedEvents).includes(event.slug));
    };
    sync();
    window.addEventListener('machiibe:prefs',sync);
    return ()=>window.removeEventListener('machiibe:prefs',sync);
  }, [event.slug]);

  const googleCalendarUrl = useMemo(() => {
    const compact = (date: string, time: string | null) => {
      if (!time) return date.replaceAll('-', '');
      return `${date.replaceAll('-', '')}T${time.replaceAll(':','').slice(0,6)}`;
    };
    const timed = Boolean(event.startTime || event.endTime);
    const googleEndDate = timed ? event.endDate : addDays(event.endDate, 1);
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', event.title);
    url.searchParams.set('dates', `${compact(event.startDate,event.startTime)}/${compact(googleEndDate,event.endTime)}`);
    url.searchParams.set('location', [event.venueName,event.address].filter(Boolean).join(' '));
    url.searchParams.set('details', event.officialUrl);
    return url.toString();
  }, [event]);

  const googleMapsUrl = event.latitude != null && event.longitude != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`;

  const appleMapsUrl = event.latitude != null && event.longitude != null
    ? `https://maps.apple.com/?daddr=${event.latitude},${event.longitude}`
    : `https://maps.apple.com/?q=${encodeURIComponent(event.address)}`;

  const parkingQuery = ['駐車場', event.venueName, event.address].filter(Boolean).join(' ');
  const parkingUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkingQuery)}`;

  const diningParams = new URLSearchParams({ event: event.title, location: event.address });
  if (event.latitude != null && event.longitude != null) {
    diningParams.set('lat', String(event.latitude));
    diningParams.set('lng', String(event.longitude));
  }
  const diningUrl = `/dining?${diningParams.toString()}`;
  const parkingReservationUrl = process.env.NEXT_PUBLIC_PARKING_RESERVATION_URL || '';

  const toggleSaved = () => {
    const next=toggleInArray(PREF_KEYS.savedEvents,event.slug);
    setSaved(next);
    void recordMetric(next ? 'save_event' : 'unsave_event',event.slug);
  };

  const toggleAttended=()=>{
    const next=toggleInArray(PREF_KEYS.attendedEvents,event.slug);
    setAttended(next);
    recordMetric(next?'attended_event':'unattended_event',event.slug);
  };

  const metric=(name:string)=>()=>{ recordMetric(name,event.slug); };

  return (
    <section className="event-action-hub">
      <div className="action-hub-title">
        <span>行くと決めたら</span>
        <strong>当日までここから準備</strong>
      </div>
      <div className="event-action-grid">
        <button type="button" className={`event-action-button ${saved ? 'is-saved' : ''}`} onClick={toggleSaved}>
          <span>♡</span><b>{saved ? '行きたい保存済み' : '行きたい'}</b>
        </button>
        <button type="button" className={`event-action-button ${attended ? 'is-attended' : ''}`} onClick={toggleAttended}>
          <span>✓</span><b>{attended ? '行った・保存済み' : '行った'}</b>
        </button>
        <a className="event-action-button" href={googleCalendarUrl} target="_blank" rel="noreferrer" onClick={metric('calendar_google')}><span>📅</span><b>Googleカレンダー</b></a>
        <a className="event-action-button" href={`/api/calendar/${event.slug}`} onClick={metric('calendar_ics')}><span>＋</span><b>カレンダーアプリ</b></a>
        <a className="event-action-button" href={googleMapsUrl} target="_blank" rel="noreferrer" onClick={metric('map_google')}><span>📍</span><b>Google Maps</b></a>
        <a className="event-action-button" href={appleMapsUrl} target="_blank" rel="noreferrer" onClick={metric('map_apple')}><span></span><b>Apple Maps</b></a>
        <a className="event-action-button" href={parkingUrl} target="_blank" rel="noreferrer" onClick={metric('parking_search')}><span>🅿</span><b>駐車場を探す</b></a>
        {parkingReservationUrl && (
          <a className="event-action-button pr-action" href={parkingReservationUrl} target="_blank" rel="sponsored noreferrer" onClick={metric('parking_search')}>
            <span>🅿</span><b>予約できる駐車場</b><small>PR</small>
          </a>
        )}
        <a className="event-action-button dining-action" href={diningUrl} onClick={metric('dining_open')}><span>🍽</span><b>遊んだ後のごはん</b></a>
      </div>
    </section>
  );
}
