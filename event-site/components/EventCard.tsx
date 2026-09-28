'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CATEGORY_OPTIONS,
  EVENT_STATUS_LABELS,
  EXPERIENCE_LABELS,
  FANDOM_LABELS,
  PRICE_LABELS
} from '@/lib/events';
import {eventLabels,formatDurationLocalized,formatEventDateLocalized} from '@/lib/event-labels';
import {localePath,type Locale} from '@/lib/i18n-config';
import { PREF_KEYS, getPreviousVisit, readStringArray, setViewed, toggleInArray, wasViewed } from '@/lib/client-prefs';
import type { EventSummary } from '@/lib/types';
import { recordMetric } from './MetricPing';
import {EventVisualFallback} from './EventVisualFallback';

const categoryLabels = {...Object.fromEntries(CATEGORY_OPTIONS),...EXPERIENCE_LABELS} as Record<string,string>;

export function EventCard({ event, respectHidden=true, locale='ja', detailBasePath='/events', returnTo, qaLabel }: { event: EventSummary; respectHidden?:boolean; locale?:Locale; detailBasePath?:string; returnTo?:string; qaLabel?:string }) {
  const labels=eventLabels(locale);
  const g=labels.generic;
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
        <p>{g.hiddenNotice}</p>
        <button type="button" onClick={undoHide}>{g.undo}</button>
      </article>
    );
  }
  if(hidden) return null;

  const detailPath=localePath(detailBasePath+'/'+event.slug,locale);
  const detailHref=returnTo?detailPath+'?return='+encodeURIComponent(returnTo):detailPath;

  return (
    <article className={`event-card ${statusAlert ? 'event-card-status-alert' : ''} ${viewed ? 'event-card-viewed' : ''}`}>
      <Link href={detailHref} className="event-card-link" aria-label={event.title} onClick={openEvent}>
        {event.image_url ? (
          <img className="event-card-image" src={event.image_url} alt={`${event.title}のイベント画像`} loading="lazy" />
        ) : (
          <EventVisualFallback event={event} />
        )}
        <div className="event-card-body">
          <div className="card-meta-line">
            {qaLabel && <span className="new-badge">{qaLabel}</span>}
            {isNew && <span className="new-badge">{g.new}</span>}
            {viewed && <span className="viewed-badge">{g.viewed}</span>}
          </div>
          {statusAlert && <div className={`event-status-banner status-${event.event_status}`}>{labels.status[event.event_status] || EVENT_STATUS_LABELS[event.event_status]}</div>}
          <div className="event-date">{formatEventDateLocalized(event.start_date,event.end_date,locale)}</div>
          <h2>{event.title}</h2>
          <p className="event-place">{[event.prefecture, event.municipality, event.venue_name].filter(Boolean).join(' · ')}</p>
          <div className="tag-row">
            <span className={`tag ${event.duration_days >= 11 ? 'tag-long' : ''}`}>{formatDurationLocalized(event.duration_days,locale)}</span>
            {(event.schedule_type==='recurring'||event.schedule_type==='irregular') && <span className="tag tag-recurring">{g.recurring}</span>}
            <span className={`tag tag-price tag-price-${event.price_type}`}>{labels.price[event.price_type] || PRICE_LABELS[event.price_type]}</span>
            {event.indoor === true && <span className="tag">{g.indoor}</span>}
            {event.audience_intent === 'child_centered' && <span className="tag tag-family">{g.childCentered}</span>}
            {event.audience_intent === 'family_friendly' && <span className="tag tag-family">{g.familyFriendly}</span>}
            {event.accessibility_keys.length > 0 && <span className="tag tag-accessibility">{g.accessibilityAvailable}</span>}
            {event.fandom_slugs.slice(0,2).map((slug) => <span className="tag tag-oshi" key={slug}>{g.fandom}：{FANDOM_LABELS[slug] || slug}</span>)}
            {event.category_keys.slice(0,2).map((key) => <span className="tag" key={key}>{labels.category[key] || labels.experience[key] || categoryLabels[key] || key}</span>)}
          </div>
        </div>
      </Link>
      {respectHidden && (
        <button className="hide-event-button" type="button" onClick={hideEvent} aria-label={`${event.title} ${g.hideFuture}`}>
          {g.hideFuture}
        </button>
      )}
    </article>
  );
}
