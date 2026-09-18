import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ACCESSIBILITY_LABELS, formatEventDate, formatDuration, getEvent } from '@/lib/events';

type Params = Promise<{slug:string}>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.summary || `${formatEventDate(event.start_date,event.end_date)}・${event.prefecture}${event.municipality || ''}で開催予定。`,
    alternates: { canonical: `/events/${event.slug}` }
  };
}

function isoDateTime(date: string, time: string | null) {
  return time ? `${date}T${time.slice(0,8)}+09:00` : date;
}

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const mapBase = process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL || 'https://machimamo-map.vercel.app';
  const mapUrl = new URL(mapBase);
  if (event.latitude != null && event.longitude != null) {
    mapUrl.searchParams.set('lat', String(event.latitude));
    mapUrl.searchParams.set('lng', String(event.longitude));
    mapUrl.searchParams.set('event', event.title);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: isoDateTime(event.start_date, event.start_time),
    endDate: isoDateTime(event.end_date, event.end_time),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue_name || undefined,
      address: [event.prefecture,event.municipality,event.address].filter(Boolean).join('')
    },
    description: event.summary || undefined,
    image: event.image_url ? [event.image_url] : undefined,
    organizer: event.organizer_name ? { '@type': 'Organization', name: event.organizer_name } : undefined,
    url: event.official_url,
    isAccessibleForFree: event.is_free ?? undefined
  };

  return (
    <main className="detail-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="detail-card">
        {event.image_url ? <img className="detail-image" src={event.image_url} alt="" /> : <div className="detail-image detail-fallback">MACHIMAMO EVENT</div>}
        <div className="detail-body">
          <div className="tag-row">
            <span className={`tag ${event.duration_days >= 31 ? 'tag-long' : ''}`}>{formatDuration(event.duration_days)}</span>
            {event.audience_intent === 'child_centered' && <span className="tag tag-family">子どもが主役</span>}
            {event.accessibility_keys.length > 0 && <span className="tag tag-accessibility">配慮情報あり</span>}
            {event.category_keys.map((key) => <span className="tag" key={key}>{key}</span>)}
            {event.is_free === true && <span className="tag tag-free">無料</span>}
            {event.indoor === true && <span className="tag">屋内</span>}
          </div>
          <h1>{event.title}</h1>
          {event.summary && <p className="detail-summary">{event.summary}</p>}

          <dl className="event-facts">
            <div><dt>開催日</dt><dd>{formatEventDate(event.start_date,event.end_date)}（{formatDuration(event.duration_days)}）</dd></div>
            {event.start_time && <div><dt>時間</dt><dd>{event.start_time.slice(0,5)}{event.end_time ? ` 〜 ${event.end_time.slice(0,5)}` : ''}</dd></div>}
            <div><dt>会場</dt><dd>{event.venue_name || '公式情報をご確認ください'}</dd></div>
            <div><dt>場所</dt><dd>{[event.prefecture,event.municipality,event.address].filter(Boolean).join(' ')}</dd></div>
            {event.price_text && <div><dt>料金</dt><dd>{event.price_text}</dd></div>}
            {event.reservation_text && <div><dt>予約</dt><dd>{event.reservation_text}</dd></div>}
            {event.organizer_name && <div><dt>主催</dt><dd>{event.organizer_name}</dd></div>}
            {event.accessibility_keys.length > 0 && (
              <div>
                <dt>配慮情報</dt>
                <dd>
                  {event.accessibility_keys.map((key) => ACCESSIBILITY_LABELS[key] || key).join('・')}
                  {event.accessibility_notes ? <><br />{event.accessibility_notes}</> : null}
                </dd>
              </div>
            )}
          </dl>

          <div className="detail-actions">
            <a className="primary-action" href={event.official_url} target="_blank" rel="noreferrer">公式情報を見る</a>
            <a className="secondary-action" href={mapUrl.toString()}>まちまもMAPで周辺を見る</a>
          </div>

          <aside className="source-box">
            <strong>情報について</strong>
            <p>出典：<a href={event.source_url} target="_blank" rel="noreferrer">{event.source_name}</a></p>
            <p>最終確認：{event.last_verified_at ? new Date(event.last_verified_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) : '確認日時未登録'}</p>
            <p>障害者向け・バリアフリー情報を含め、開催内容・料金・申込条件は変更される場合があります。来場前に必ず公式情報をご確認ください。</p>
          </aside>
        </div>
      </article>
    </main>
  );
}
