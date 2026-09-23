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
  getEvent,
  isTrustedLocation,
  japanToday
} from '@/lib/events';
import { breadcrumbJsonLd, safeJsonLd, siteUrl } from '@/lib/seo';
import { slugByPrefecture } from '@/lib/prefectures';
import { machimamoMapUrl } from '@/lib/url-config';
import { getRequestLocale } from '@/lib/i18n-server';
import { getMessages } from '@/lib/i18n';
import { localePath,type Locale } from '@/lib/i18n-config';
import {eventLabels,formatDurationLocalized,formatEventDateLocalized} from '@/lib/event-labels';


const detailCopy:Record<Locale,{
  breadcrumb:string;status:string;date:string;occurrences:string;time:string;venue:string;place:string;
  priceType:string;priceDetail:string;reservation:string;organizer:string;accessibility:string;
  checkOfficial:string;occurrenceFallback:string;venueFallback:string;
  supportTitle:string;supportTrustedPrefix:string;supportBody:string;supportPoints:[string,string,string,string];supportCta:string;
  officialCta:string;mapCta:string;about:string;source:string;lastChecked:string;unchecked:string;sourceNotice:string;corrections:string;
  cancelled:string;soldOut:string;registrationClosed:string;postponed:string;timeUnknown:string
}>={
  ja:{breadcrumb:'パンくず',status:'開催状況',date:'開催日',occurrences:'実開催日',time:'時間',venue:'会場',place:'場所',priceType:'料金区分',priceDetail:'料金詳細',reservation:'予約',organizer:'主催',accessibility:'配慮情報',checkOfficial:'公式情報をご確認ください',occurrenceFallback:'公式情報で実開催日をご確認ください',venueFallback:'公式情報をご確認ください',supportTitle:'行き先が決まったら、会場周辺の安心も確認',supportTrustedPrefix:'確認済みの会場位置を基準に、',supportBody:'暑さ指数（WBGT）、AED、交番・警察署などをまちまもMAPで確認できます。',supportPoints:['🌡 暑さ','❤️ AED','👮 交番','🗺 周辺'],supportCta:'まちまもで会場周辺を見る →',officialCta:'公式情報を見る',mapCta:'まちまもMAPで周辺を見る',about:'情報について',source:'出典',lastChecked:'最終確認',unchecked:'確認日時未登録',sourceNotice:'開催内容・料金・申込条件は変更される場合があります。来場前に必ず公式情報をご確認ください。',corrections:'掲載情報の訂正・掲載停止について',cancelled:'中止',soldOut:'完売',registrationClosed:'受付終了',postponed:'延期',timeUnknown:'時間未定'},
  en:{breadcrumb:'Breadcrumb',status:'Status',date:'Date',occurrences:'Event dates',time:'Time',venue:'Venue',place:'Location',priceType:'Price',priceDetail:'Price details',reservation:'Reservation',organizer:'Organizer',accessibility:'Accessibility',checkOfficial:'Check the official website',occurrenceFallback:'Check the official website for actual event dates',venueFallback:'Check the official website',supportTitle:'After choosing where to go, check the area around the venue',supportTrustedPrefix:'Using the verified venue location, ',supportBody:'check heat index (WBGT), AEDs, police facilities and nearby information on Machimamo Map.',supportPoints:['🌡 Heat','❤️ AED','👮 Police','🗺 Nearby'],supportCta:'View venue area on Machimamo →',officialCta:'View official information',mapCta:'View nearby area on Machimamo',about:'About this information',source:'Source',lastChecked:'Last checked',unchecked:'Not recorded',sourceNotice:'Event details, prices and reservation conditions may change. Always check the latest official information before visiting.',corrections:'Corrections / removal requests',cancelled:'Cancelled',soldOut:'Sold out',registrationClosed:'Registration closed',postponed:'Postponed',timeUnknown:'Time TBD'},
  'zh-cn':{breadcrumb:'面包屑导航',status:'举办状态',date:'举办日期',occurrences:'实际举办日',time:'时间',venue:'会场',place:'地点',priceType:'费用',priceDetail:'费用详情',reservation:'预约',organizer:'主办方',accessibility:'无障碍・照护信息',checkOfficial:'请查看官方网站',occurrenceFallback:'实际举办日期请查看官方网站',venueFallback:'请查看官方网站',supportTitle:'决定目的地后，也确认会场周边的安全信息',supportTrustedPrefix:'以已确认的会场位置为基准，',supportBody:'可在 Machimamo 地图查看暑热指数（WBGT）、AED、派出所・警察署及周边信息。',supportPoints:['🌡 暑热','❤️ AED','👮 警察','🗺 周边'],supportCta:'在 Machimamo 查看会场周边 →',officialCta:'查看官方信息',mapCta:'在 Machimamo 查看周边',about:'关于本信息',source:'来源',lastChecked:'最后确认',unchecked:'未记录确认时间',sourceNotice:'活动内容、费用和预约条件可能发生变化。出发前请务必查看官方最新信息。',corrections:'信息更正・下架申请',cancelled:'取消',soldOut:'售罄',registrationClosed:'报名截止',postponed:'延期',timeUnknown:'时间未定'},
  'zh-tw':{breadcrumb:'麵包屑導覽',status:'舉辦狀態',date:'舉辦日期',occurrences:'實際舉辦日',time:'時間',venue:'會場',place:'地點',priceType:'費用',priceDetail:'費用詳情',reservation:'預約',organizer:'主辦單位',accessibility:'無障礙・照護資訊',checkOfficial:'請查看官方網站',occurrenceFallback:'實際舉辦日期請查看官方網站',venueFallback:'請查看官方網站',supportTitle:'決定目的地後，也確認會場周邊的安全資訊',supportTrustedPrefix:'以已確認的會場位置為基準，',supportBody:'可在 Machimamo 地圖查看暑熱指數（WBGT）、AED、派出所・警察署及周邊資訊。',supportPoints:['🌡 暑熱','❤️ AED','👮 警察','🗺 周邊'],supportCta:'在 Machimamo 查看會場周邊 →',officialCta:'查看官方資訊',mapCta:'在 Machimamo 查看周邊',about:'關於本資訊',source:'來源',lastChecked:'最後確認',unchecked:'未記錄確認時間',sourceNotice:'活動內容、費用和預約條件可能變更。出發前請務必查看官方最新資訊。',corrections:'資訊更正・下架申請',cancelled:'取消',soldOut:'售罄',registrationClosed:'報名截止',postponed:'延期',timeUnknown:'時間未定'},
  ko:{breadcrumb:'경로',status:'개최 상태',date:'개최일',occurrences:'실제 개최일',time:'시간',venue:'장소',place:'위치',priceType:'요금',priceDetail:'요금 상세',reservation:'예약',organizer:'주최',accessibility:'접근성 정보',checkOfficial:'공식 사이트를 확인해 주세요',occurrenceFallback:'실제 개최일은 공식 사이트에서 확인해 주세요',venueFallback:'공식 사이트를 확인해 주세요',supportTitle:'목적지를 정했다면 행사장 주변 안전도 확인하세요',supportTrustedPrefix:'확인된 행사장 위치를 기준으로 ',supportBody:'더위 지수(WBGT), AED, 파출소・경찰서 등 주변 정보를 Machimamo 지도에서 확인할 수 있습니다.',supportPoints:['🌡 더위','❤️ AED','👮 경찰','🗺 주변'],supportCta:'Machimamo에서 행사장 주변 보기 →',officialCta:'공식 정보 보기',mapCta:'Machimamo에서 주변 보기',about:'정보 안내',source:'출처',lastChecked:'최종 확인',unchecked:'확인 시간 미등록',sourceNotice:'행사 내용, 요금, 신청 조건은 변경될 수 있습니다. 방문 전 반드시 공식 최신 정보를 확인해 주세요.',corrections:'정보 정정・게시 중단 요청',cancelled:'취소',soldOut:'매진',registrationClosed:'접수 종료',postponed:'연기',timeUnknown:'시간 미정'}
};

type Params = Promise<{slug:string}>;
const categoryLabels = Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const locale=await getRequestLocale();
  const labels=eventLabels(locale);
  const { slug } = await params;
  const event = await getEvent(slug,locale);
  if (!event) return {};
  const title = event.title;
  const statusPrefix=event.event_status === 'cancelled' ? `[${labels.status.cancelled}] ` : event.event_status === 'postponed' ? `[${labels.status.postponed}] ` : '';
  const description = event.summary || `${formatEventDateLocalized(event.start_date,event.end_date,locale)} · ${event.prefecture}${event.municipality || ''}`;
  const localizedPath=localePath(`/events/${event.slug}`,locale);
  return {
    title:`${statusPrefix}${title}`,
    description,
    alternates: {
      canonical:localizedPath,
      languages:{
        'ja-JP':`/events/${event.slug}`,
        en:`/en/events/${event.slug}`,
        'zh-Hans':`/zh-cn/events/${event.slug}`,
        'zh-Hant':`/zh-tw/events/${event.slug}`,
        ko:`/ko/events/${event.slug}`,
        'x-default':`/events/${event.slug}`
      }
    },
    openGraph: {
      type: 'website',title:`${statusPrefix}${title}`,description,url:localizedPath,
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
  const locale=await getRequestLocale();
  const messages=getMessages(locale);
  const labels=eventLabels(locale);
  const g=labels.generic;
  const t=detailCopy[locale] || detailCopy.ja;
  const { slug } = await params;
  const event = await getEvent(slug,locale);
  if (!event) notFound();

  const address = [event.prefecture,event.municipality,event.address].filter(Boolean).join(' ');
  const trustedLocation=isTrustedLocation(event);
  const mapBase = machimamoMapUrl();
  const mapUrl = new URL(mapBase);
  mapUrl.searchParams.set('from','machiibe');
  mapUrl.searchParams.set('eventSlug',event.slug);
  if (trustedLocation) {
    mapUrl.searchParams.set('lat', String(event.latitude));
    mapUrl.searchParams.set('lng', String(event.longitude));
    mapUrl.searchParams.set('event', event.title);
  }

  const eventPageUrl = siteUrl(localePath(`/events/${event.slug}`,locale));
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
    { name: 'まちイベ', path: localePath('/',locale) },
    ...(prefSlug ? [{ name: event.prefecture, path: localePath(`/area/${prefSlug}`,locale) }] : []),
    { name: event.title, path: localePath(`/events/${event.slug}`,locale) }
  ];
  const breadcrumb = breadcrumbJsonLd(breadcrumbItems);

  return (
    <main className="detail-wrap">
      <MetricPing metric="event_view" eventSlug={event.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <nav className="breadcrumb" aria-label={t.breadcrumb}>
        <Link href={localePath('/',locale)}>まちイベ</Link>
        {prefSlug && <><span>›</span><Link href={localePath(`/area/${prefSlug}`,locale)}>{event.prefecture}</Link></>}
        <span>›</span><span>{event.title}</span>
      </nav>

      <article className="detail-card">
        {event.image_url ? <img className="detail-image" src={event.image_url} alt={`${event.title}のイベント画像`} /> : <div className="detail-image detail-fallback">MACHI IBE</div>}
        <div className="detail-body">
          {event.event_status !== 'scheduled' && (
            <div className={`detail-status-alert status-${event.event_status}`} role="status">
              <strong>{labels.status[event.event_status] || EVENT_STATUS_LABELS[event.event_status]}</strong>
              {event.status_note && <span>{event.status_note}</span>}
            </div>
          )}

          <div className="tag-row">
            <span className={`tag ${event.duration_days >= 11 ? 'tag-long' : ''}`}>{formatDurationLocalized(event.duration_days,locale)}</span>
            <span className={`tag tag-price tag-price-${event.price_type}`}>{labels.price[event.price_type] || PRICE_LABELS[event.price_type]}</span>
            {event.audience_intent === 'child_centered' && <span className="tag tag-family">{g.childCentered}</span>}
            {event.audience_intent === 'family_friendly' && <span className="tag tag-family">{g.familyFriendly}</span>}
            {event.accessibility_keys.length > 0 && <span className="tag tag-accessibility">{g.accessibilityAvailable}</span>}
            {event.fandom_slugs.map((slug) => <span className="tag tag-oshi" key={slug}>{g.fandom}：{FANDOM_LABELS[slug] || slug}</span>)}
            {event.category_keys.map((key) => <span className="tag" key={key}>{labels.category[key] || labels.experience[key] || categoryLabels[key] || key}</span>)}
            {event.indoor === true && <span className="tag">{g.indoor}</span>}
          </div>
          <h1>{event.title}</h1>
          {event.summary && <p className="detail-summary">{event.summary}</p>}

          <EventActions locale={locale} event={{
            slug:event.slug,title:event.title,startDate:event.start_date,endDate:event.end_date,
            startTime:event.start_time,endTime:event.end_time,scheduleType:event.schedule_type,eventStatus:event.event_status,
            occurrences:event.occurrences || [],venueName:event.venue_name,address,
            latitude:trustedLocation ? event.latitude : null,
            longitude:trustedLocation ? event.longitude : null,
            officialUrl:event.official_url,
            pageUrl:eventPageUrl,
            dateText:formatEventDateLocalized(event.start_date,event.end_date,locale),
            placeText:[event.prefecture,event.municipality,event.venue_name].filter(Boolean).join(' '),
            sharePrefix:event.event_status==='cancelled'?`[${labels.status.cancelled}]`:event.event_status==='postponed'?`[${labels.status.postponed}]`:event.event_status==='sold_out'?`[${labels.status.sold_out}]`:event.event_status==='registration_closed'?`[${labels.status.registration_closed}]`:undefined,
            shareConditionText:[
              event.audience_intent==='child_centered'?g.childCentered:event.audience_intent==='family_friendly'?g.familyFriendly:'',
              event.indoor===true?g.indoor:'',
              labels.price[event.price_type] || PRICE_LABELS[event.price_type],
              ...event.category_keys.slice(0,2).map((key)=>labels.category[key]||labels.experience[key]||categoryLabels[key]||'')
            ].filter(Boolean).slice(0,4).join('・'),
            shareSummary:event.summary||undefined,
            shareTimeText:event.start_time ? (event.end_time?`${event.start_time.slice(0,5)}–${event.end_time.slice(0,5)}`:event.start_time.slice(0,5)) : t.timeUnknown
          }} />

          <dl className="event-facts">
            <div><dt>{t.status}</dt><dd>{labels.status[event.event_status] || EVENT_STATUS_LABELS[event.event_status]}{event.status_note ? ` — ${event.status_note}` : ''}</dd></div>
            <div><dt>{t.date}</dt><dd>{formatEventDateLocalized(event.start_date,event.end_date,locale)} ({formatDurationLocalized(event.duration_days,locale)})</dd></div>
            {(event.schedule_type==='recurring'||event.schedule_type==='irregular') && (
              <div>
                <dt>{t.occurrences}</dt>
                <dd className="occurrence-list">
                  {(event.occurrences || []).length
                    ? event.occurrences.map((item)=>(
                        <span key={`${item.date}-${item.start_time||''}`} className={item.status==='cancelled'?'occurrence-cancelled':''}>
                          {item.date}{item.start_time?` ${item.start_time.slice(0,5)}`:''}
                          {item.status==='cancelled'?` (${t.cancelled})`:item.status==='sold_out'?` (${t.soldOut})`:item.status==='registration_closed'?` (${t.registrationClosed})`:''}
                        </span>
                      ))
                    : t.occurrenceFallback}
                </dd>
              </div>
            )}
            {event.start_time && <div><dt>{t.time}</dt><dd>{event.start_time.slice(0,5)}{event.end_time ? ` 〜 ${event.end_time.slice(0,5)}` : ''}</dd></div>}
            <div><dt>{t.venue}</dt><dd>{event.venue_name || t.venueFallback}</dd></div>
            <div><dt>{t.place}</dt><dd>{address}<br /><small>{labels.location[event.location_precision] || LOCATION_PRECISION_LABELS[event.location_precision]}</small></dd></div>
            <div><dt>{t.priceType}</dt><dd>{labels.price[event.price_type] || PRICE_LABELS[event.price_type]}</dd></div>
            {event.price_text && <div><dt>{t.priceDetail}</dt><dd>{event.price_text}</dd></div>}
            {event.reservation_text && <div><dt>{t.reservation}</dt><dd>{event.reservation_text}</dd></div>}
            {event.organizer_name && <div><dt>{t.organizer}</dt><dd>{event.organizer_name}</dd></div>}
            {event.accessibility_keys.length > 0 && (
              <div>
                <dt>{t.accessibility}</dt>
                <dd>
                  {event.accessibility_keys.map((key) => labels.accessibility[key] || ACCESSIBILITY_LABELS[key] || key).join('・')}
                  {event.accessibility_notes ? <><br />{event.accessibility_notes}</> : null}
                </dd>
              </div>
            )}
          </dl>

          <section className="machimamo-day-support">
            <div>
              <span>まちイベ → まちまも</span>
              <h2>{t.supportTitle}</h2>
              <p>{trustedLocation ? t.supportTrustedPrefix : ''}{t.supportBody}</p>
              <div className="machimamo-detail-points">{t.supportPoints.map((point)=><b key={point}>{point}</b>)}</div>
            </div>
            <TrackedLink href={mapUrl.toString()} metric="machimamo_map" eventSlug={event.slug}>{t.supportCta}</TrackedLink>
          </section>

          <div className="detail-actions">
            <a className="primary-action" href={event.official_url} target="_blank" rel="noreferrer">{t.officialCta}</a>
            <TrackedLink className="secondary-action" href={mapUrl.toString()} metric="machimamo_map" eventSlug={event.slug}>{t.mapCta}</TrackedLink>
          </div>

          <aside className="source-box">
            <strong>{t.about}</strong>
            <p>{t.source}：<a href={event.source_url} target="_blank" rel="noreferrer">{event.source_name}</a></p>
            <p>{t.lastChecked}：{event.last_verified_at ? new Date(event.last_verified_at).toLocaleString(locale==='zh-cn'?'zh-CN':locale==='zh-tw'?'zh-TW':locale==='ko'?'ko-KR':locale==='en'?'en-US':'ja-JP',{timeZone:'Asia/Tokyo'}) : t.unchecked}</p>
            <p>{t.sourceNotice}</p>
            {locale!=='ja' && <p>{messages.translationNotice}</p>}
            <p><Link href={`${localePath('/corrections',locale)}?event=${encodeURIComponent(event.slug)}`}>{t.corrections}</Link></p>
          </aside>
        </div>
      </article>
    </main>
  );
}
