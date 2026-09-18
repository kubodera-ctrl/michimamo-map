'use client';

import { useEffect, useMemo, useState } from 'react';

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

const SAVED_KEY = 'machimamo_saved_events_v1';

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function EventActions({ event }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSaved().includes(event.slug));
  }, [event.slug]);

  const googleCalendarUrl = useMemo(() => {
    const compact = (date: string, time: string | null) => {
      if (!time) return date.replaceAll('-', '');
      return `${date.replaceAll('-', '')}T${time.replaceAll(':','').slice(0,6)}`;
    };
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', event.title);
    url.searchParams.set('dates', `${compact(event.startDate,event.startTime)}/${compact(event.endDate,event.endTime)}`);
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

  const parkingUrl = event.latitude != null && event.longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('駐車場')}&query_place_id=&center=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address + ' 駐車場')}`;

  const diningUrl = new URL('/dining', window.location.origin);
  diningUrl.searchParams.set('event', event.title);
  if (event.latitude != null && event.longitude != null) {
    diningUrl.searchParams.set('lat', String(event.latitude));
    diningUrl.searchParams.set('lng', String(event.longitude));
  }

  const toggleSaved = () => {
    const current = new Set(readSaved());
    if (current.has(event.slug)) current.delete(event.slug);
    else current.add(event.slug);
    localStorage.setItem(SAVED_KEY, JSON.stringify([...current]));
    setSaved(current.has(event.slug));
  };

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
        <a className="event-action-button" href={googleCalendarUrl} target="_blank" rel="noreferrer"><span>📅</span><b>Googleカレンダー</b></a>
        <a className="event-action-button" href={`/api/calendar/${event.slug}`}><span>＋</span><b>カレンダーアプリ</b></a>
        <a className="event-action-button" href={googleMapsUrl} target="_blank" rel="noreferrer"><span>📍</span><b>Google Maps</b></a>
        <a className="event-action-button" href={appleMapsUrl} target="_blank" rel="noreferrer"><span></span><b>Apple Maps</b></a>
        <a className="event-action-button" href={parkingUrl} target="_blank" rel="noreferrer"><span>🅿</span><b>駐車場を探す</b></a>
        <a className="event-action-button dining-action" href={diningUrl.toString()}><span>🍽</span><b>遊んだ後のごはん</b></a>
      </div>
    </section>
  );
}
