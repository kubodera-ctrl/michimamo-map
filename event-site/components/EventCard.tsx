'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CATEGORY_OPTIONS,
  EVENT_STATUS_LABELS,
  EXPERIENCE_LABELS,
  FANDOM_LABELS,
  PRICE_LABELS,
  formatDuration,
  formatEventDate
} from '@/lib/events';
import { PREF_KEYS, getPreviousVisit, readStringArray, setViewed, toggleInArray, wasViewed } from '@/lib/client-prefs';
import type { EventSummary } from '@/lib/types';
import { recordMetric } from './MetricPing';

const categoryLabels = {...Object.fromEntries(CATEGORY_OPTIONS),...EXPERIENCE_LABELS} as Record<string,string>;

export function EventCard({ event, respectHidden=true }: { event: EventSummary; respectHidden?:boolean }) {
  const statusAlert=event.event_status !== 'scheduled';
  const [hidden,setHidden]=useState(false);
  const [viewed,setViewedState]=useState(false);
  const [isNew,setIsNew]=useState(false);
  const [justHidden,setJustHidden]=useState(false);

  useEffect(()=>{
    setHidden(respectHidden && readStringArray(PREF_KEYS.hiddenEvents).includes(event.slug));
    setViewedState(wasViewed(event.slug));
    const previous=getPreviousVisit();
    setIsNew(Boolean(previous && Date.parse(event.created_at)>Date.parse(previous)));
  },[event.slug,event.created_at,respectHidden]);

  const openEvent=()=>{
    setViewed(event.slug);
    setViewedState(true);
    void recordMetric('event_open',event.slug);
  };

  const hideEvent=()=>{
    const next=toggleInArray(PREF_KEYS.hiddenEvents,event.slug);
    setHidden(respectHidden && next);
    setJustHidden(next);
  };

  const undoHide=()=>{
    const next=toggleInArray(PREF_KEYS.hiddenEvents,event.slug);
    setHidden(respectHidden && next);
    setJustHidden(false);
  };

  if(hidden && justHidden) {
    return (
      <article className="event-card event-card-hidden-undo">
        <p>このイベントを今後の一覧から非表示にしました。</p>
        <button type="button" onClick={undoHide}>元に戻す</button>
      </article>
    );
  }
  if(hidden) return null;

  return (
    <article className={`event-card ${statusAlert ? 'event-card-status-alert' : ''} ${viewed ? 'event-card-viewed' : ''}`}>
      <Link href={`/events/${event.slug}`} className="event-card-link" aria-label={event.title} onClick={openEvent}>
        {event.image_url ? (
          <img className="event-card-image" src={event.image_url} alt={`${event.title}のイベント画像`} loading="lazy" />
        ) : (
          <div className="event-card-image event-card-fallback">
            <span>まちイベ</span>
            <strong>EVENT</strong>
          </div>
        )}
        <div className="event-card-body">
          <div className="card-meta-line">
            {isNew && <span className="new-badge">新着</span>}
            {viewed && <span className="viewed-badge">閲覧済み</span>}
          </div>
          {statusAlert && <div className={`event-status-banner status-${event.event_status}`}>{EVENT_STATUS_LABELS[event.event_status]}</div>}
          <div className="event-date">{formatEventDate(event.start_date, event.end_date)}</div>
          <h2>{event.title}</h2>
          <p className="event-place">{[event.prefecture, event.municipality, event.venue_name].filter(Boolean).join(' · ')}</p>
          <div className="tag-row">
            <span className={`tag ${event.duration_days >= 11 ? 'tag-long' : ''}`}>{formatDuration(event.duration_days)}</span>
            {(event.schedule_type==='recurring'||event.schedule_type==='irregular') && <span className="tag tag-recurring">開催日指定あり</span>}
            <span className={`tag tag-price tag-price-${event.price_type}`}>{PRICE_LABELS[event.price_type]}</span>
            {event.indoor === true && <span className="tag">屋内</span>}
            {event.audience_intent === 'child_centered' && <span className="tag tag-family">子どもが主役</span>}
            {event.audience_intent === 'family_friendly' && <span className="tag tag-family">ファミリー向け</span>}
            {event.accessibility_keys.length > 0 && <span className="tag tag-accessibility">配慮情報あり</span>}
            {event.fandom_slugs.slice(0,2).map((slug) => <span className="tag tag-oshi" key={slug}>推し活：{FANDOM_LABELS[slug] || slug}</span>)}
            {event.category_keys.slice(0,2).map((key) => <span className="tag" key={key}>{categoryLabels[key] || key}</span>)}
          </div>
        </div>
      </Link>
      {respectHidden && (
        <button className="hide-event-button" type="button" onClick={hideEvent} aria-label={`${event.title}を今後表示しない`}>
          今後表示しない
        </button>
      )}
    </article>
  );
}
