import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventActions } from '@/components/EventActions';
import { TrackedLink } from '@/components/TrackedLink';
import { MetricPing } from '@/components/MetricPing';
import {
  ACCESSIBILITY_LABELS,
  CATEGORY_OPTIONS,
  EVENT_STATUS_LABELS,
  FANDOM_LABELS,
  LOCATION_PRECISION_LABELS,
  PRICE_LABELS,
  formatEventDate,
  formatDuration,
  getEvent,
  isTrustedLocation,
  japanToday
} from '@/lib/events';
import { breadcrumbJsonLd, safeJsonLd, siteUrl } from '@/lib/seo';
import { slugByPrefecture } from '@/lib/prefectures';

type Params = Promise<{slug:string}>;
const categoryLabels = Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return {};
  const title = event.title;
  const statusPrefix=event.event_status === 'cancelled' ? '【中止】' : event.event_status === 'postponed' ? '【延期】' : '';
  const description = event.summary || `${formatEventDate(event.start_date,event.end_date)}・${event.prefecture}${event.municipality || ''}で開催予定。`;
  return {
    title:`${statusPrefix}${title}`,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      type: 'website',title:`${statusPrefix}${title}`,description,url: `/events/${event.slug}`,
      images: event.image_url ? [{ url: event.image_url }] : undefined
    },
    twitter: {
      card: event.image_url ? 'summary_large_image' : 'summary',
      title:`${statusPrefix}${title}`,description,
      images: event.image_url ? [event.image_url] : undefined
    }
  };
}

function isoDateTime(date: string, time: string | null) {
  return time ? `${date}T${time.slice(0,8)}+09:00` : date;
}

function schemaEventStatus(status:string) {
  if (status === 'cancelled') return 'https://schema.org/EventCancelled';
  if (status === 'postponed') return 'https://schema.org/EventPostponed';
  return 'https://schema.org/EventScheduled';
}

export default async function EventPage({ params }: { params: Params }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const address = [event.prefecture,event.municipality,event.address].filter(Boolean).join(' ');
  const trustedLocation=isTrustedLocation(event);
  const mapBase = process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL || 'https://machimamo-map.vercel.app';
  const mapUrl = new URL(mapBase);
  if (trustedLocation) {
    mapUrl.searchParams.set('lat', String(event.latitude));
    mapUrl.searchParams.set('lng', String(event.longitude));
    mapUrl.searchParams.set('event', event.title);
  }

  const eventPageUrl = siteUrl(`/events/${event.slug}`);
  const today=japanToday();
  const schemaOccurrence=(event.schedule_type==='recurring'||event.schedule_type==='irregular')
    ? (event.occurrences || []).find((item)=>item.date>=today && item.status==='scheduled')
    : undefined;
  const schemaStartDate=schemaOccurrence?.date || event.start_date;
  const schemaEndDate=schemaOccurrence?.date || event.end_date;
  const schemaStartTime=schemaOccurrence?.start_time ?? event.start_time;
  const schemaEndTime=schemaOccurrence?.end_time ?? event.end_time;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: isoDateTime(schemaStartDate, schemaStartTime),
    endDate: isoDateTime(schemaEndDate, schemaEndTime),
    eventStatus: schemaEventStatus(event.event_status),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue_name || undefined,
      address: {
        '@type': 'PostalAddress',
        postalCode: event.postal_code || undefined,
        addressRegion: event.prefecture,
        addressLocality: event.municipality || undefined,
        streetAddress: event.address || undefined,
        addressCountry: 'JP'
      }
    },
    description: event.summary || undefined,
    image: event.image_url ? [event.image_url] : undefined,
    organizer: event.organizer_name ? { '@type': 'Organization', name: event.organizer_name } : undefined,
    url: eventPageUrl,
    sameAs: event.official_url,
    isAccessibleForFree: event.price_type === 'free' ? true : event.price_type === 'paid' ? false : undefined
  };

  const prefSlug = slugByPrefecture[event.prefecture];
  const breadcrumbItems = [
    { name: 'まちイベ', path: '/' },
    ...(prefSlug ? [{ name: event.prefecture, path: `/area/${prefSlug}` }] : []),
    { name: event.title, path: `/events/${event.slug}` }
  ];
  const breadcrumb = breadcrumbJsonLd(breadcrumbItems);

  return (
    <main className="detail-wrap">
      <MetricPing metric="event_view" eventSlug={event.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/">まちイベ</Link>
        {prefSlug && <><span>›</span><Link href={`/area/${prefSlug}`}>{event.prefecture}</Link></>}
        <span>›</span><span>{event.title}</span>
      </nav>

      <article className="detail-card">
        {event.image_url ? <img className="detail-image" src={event.image_url} alt={`${event.title}のイベント画像`} /> : <div className="detail-image detail-fallback">MACHI IBE</div>}
        <div className="detail-body">
          {event.event_status !== 'scheduled' && (
            <div className={`detail-status-alert status-${event.event_status}`} role="status">
              <strong>{EVENT_STATUS_LABELS[event.event_status]}</strong>
              {event.status_note && <span>{event.status_note}</span>}
            </div>
          )}

          <div className="tag-row">
            <span className={`tag ${event.duration_days >= 11 ? 'tag-long' : ''}`}>{formatDuration(event.duration_days)}</span>
            <span className={`tag tag-price tag-price-${event.price_type}`}>{PRICE_LABELS[event.price_type]}</span>
            {event.audience_intent === 'child_centered' && <span className="tag tag-family">子どもが主役</span>}
            {event.audience_intent === 'family_friendly' && <span className="tag tag-family">ファミリー向け</span>}
            {event.accessibility_keys.length > 0 && <span className="tag tag-accessibility">配慮情報あり</span>}
            {event.fandom_slugs.map((slug) => <span className="tag tag-oshi" key={slug}>推し活：{FANDOM_LABELS[slug] || slug}</span>)}
            {event.category_keys.map((key) => <span className="tag" key={key}>{categoryLabels[key] || key}</span>)}
            {event.indoor === true && <span className="tag">屋内</span>}
          </div>
          <h1>{event.title}</h1>
          {event.summary && <p className="detail-summary">{event.summary}</p>}

          <EventActions event={{
            slug:event.slug,title:event.title,startDate:event.start_date,endDate:event.end_date,
            startTime:event.start_time,endTime:event.end_time,scheduleType:event.schedule_type,eventStatus:event.event_status,
            occurrences:event.occurrences || [],venueName:event.venue_name,address,
            latitude:trustedLocation ? event.latitude : null,
            longitude:trustedLocation ? event.longitude : null,
            officialUrl:event.official_url,
            pageUrl:eventPageUrl,
            dateText:formatEventDate(event.start_date,event.end_date),
            placeText:[event.prefecture,event.municipality,event.venue_name].filter(Boolean).join(' '),
            sharePrefix:event.event_status==='cancelled'?'【中止】':event.event_status==='postponed'?'【延期】':event.event_status==='sold_out'?'【完売】':event.event_status==='registration_closed'?'【受付終了】':undefined,
            shareConditionText:[
              event.audience_intent==='child_centered'?'子どもが主役':event.audience_intent==='family_friendly'?'ファミリー向け':'',
              event.indoor===true?'屋内':'',
              PRICE_LABELS[event.price_type],
              ...event.category_keys.slice(0,2).map((key)=>categoryLabels[key]||'')
            ].filter(Boolean).slice(0,4).join('・'),
            shareSummary:event.summary||undefined,
            shareTimeText:event.start_time ? (event.end_time?`${event.start_time.slice(0,5)}〜${event.end_time.slice(0,5)}`:event.start_time.slice(0,5)) : '時間未定'
          }} />

          <dl className="event-facts">
            <div><dt>開催状況</dt><dd>{EVENT_STATUS_LABELS[event.event_status]}{event.status_note ? ` — ${event.status_note}` : ''}</dd></div>
            <div><dt>開催日</dt><dd>{formatEventDate(event.start_date,event.end_date)}（{formatDuration(event.duration_days)}）</dd></div>
            {(event.schedule_type==='recurring'||event.schedule_type==='irregular') && (
              <div>
                <dt>実開催日</dt>
                <dd className="occurrence-list">
                  {(event.occurrences || []).length
                    ? event.occurrences.map((item)=>(
                        <span key={`${item.date}-${item.start_time||''}`} className={item.status==='cancelled'?'occurrence-cancelled':''}>
                          {item.date}{item.start_time?` ${item.start_time.slice(0,5)}`:''}
                          {item.status==='cancelled'?'（中止）':item.status==='sold_out'?'（完売）':item.status==='registration_closed'?'（受付終了）':''}
                        </span>
                      ))
                    : '公式情報で実開催日をご確認ください'}
                </dd>
              </div>
            )}
            {event.start_time && <div><dt>時間</dt><dd>{event.start_time.slice(0,5)}{event.end_time ? ` 〜 ${event.end_time.slice(0,5)}` : ''}</dd></div>}
            <div><dt>会場</dt><dd>{event.venue_name || '公式情報をご確認ください'}</dd></div>
            <div><dt>場所</dt><dd>{address}<br /><small>{LOCATION_PRECISION_LABELS[event.location_precision]}</small></dd></div>
            <div><dt>料金区分</dt><dd>{PRICE_LABELS[event.price_type]}</dd></div>
            {event.price_text && <div><dt>料金詳細</dt><dd>{event.price_text}</dd></div>}
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

          <section className="machimamo-day-support">
            <div>
              <span>当日の安心</span>
              <h2>会場周辺は、まちまもで確認</h2>
              <p>{trustedLocation ? '確認済みの会場位置を基準に、' : ''}WBGT、AED、交番、周辺道路の安全情報などを確認できる導線を段階接続します。</p>
            </div>
            <TrackedLink href={mapUrl.toString()} metric="machimamo_map" eventSlug={event.slug}>まちまもMAPで周辺を見る</TrackedLink>
          </section>

          <div className="detail-actions">
            <a className="primary-action" href={event.official_url} target="_blank" rel="noreferrer">公式情報を見る</a>
            <TrackedLink className="secondary-action" href={mapUrl.toString()} metric="machimamo_map" eventSlug={event.slug}>まちまもMAPで周辺を見る</TrackedLink>
          </div>

          <aside className="source-box">
            <strong>情報について</strong>
            <p>出典：<a href={event.source_url} target="_blank" rel="noreferrer">{event.source_name}</a></p>
            <p>最終確認：{event.last_verified_at ? new Date(event.last_verified_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) : '確認日時未登録'}</p>
            <p>開催内容・料金・申込条件は変更される場合があります。来場前に必ず公式情報をご確認ください。</p>
            <p><Link href={`/corrections?event=${encodeURIComponent(event.slug)}`}>掲載情報の訂正・掲載停止について</Link></p>
          </aside>
        </div>
      </article>
    </main>
  );
}
