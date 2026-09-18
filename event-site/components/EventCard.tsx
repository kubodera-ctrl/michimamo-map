import Link from 'next/link';
import { CATEGORY_OPTIONS, FANDOM_LABELS, formatDuration, formatEventDate } from '@/lib/events';
import type { EventSummary } from '@/lib/types';

const categoryLabels = Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <article className="event-card">
      <Link href={`/events/${event.slug}`} className="event-card-link" aria-label={event.title}>
        {event.image_url ? (
          <div className="event-card-image" style={{ backgroundImage: `url("${event.image_url}")` }} />
        ) : (
          <div className="event-card-image event-card-fallback">
            <span>まちイベ</span>
            <strong>EVENT</strong>
          </div>
        )}
        <div className="event-card-body">
          <div className="event-date">{formatEventDate(event.start_date, event.end_date)}</div>
          <h2>{event.title}</h2>
          <p className="event-place">{[event.prefecture, event.municipality, event.venue_name].filter(Boolean).join(' · ')}</p>
          <div className="tag-row">
            <span className={`tag ${event.duration_days >= 11 ? 'tag-long' : ''}`}>{formatDuration(event.duration_days)}</span>
            {event.is_free === true && <span className="tag tag-free">無料</span>}
            {event.indoor === true && <span className="tag">屋内</span>}
            {event.audience_intent === 'child_centered' && <span className="tag tag-family">子どもが主役</span>}
            {event.accessibility_keys.length > 0 && <span className="tag tag-accessibility">配慮情報あり</span>}
            {event.fandom_slugs.slice(0,2).map((slug) => <span className="tag tag-oshi" key={slug}>推し活：{FANDOM_LABELS[slug] || slug}</span>)}
            {event.category_keys.slice(0,2).map((key) => (
              <span className="tag" key={key}>{categoryLabels[key] || key}</span>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
