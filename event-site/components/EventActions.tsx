'use client';

import { useEffect, useMemo, useState } from 'react';
import { PREF_KEYS, getPlannedDate, getPlannedOccurrence, readStringArray, setPlannedDate, setPlannedOccurrence, toggleInArray } from '@/lib/client-prefs';
import { recordMetric } from './MetricPing';
import { buildXShareUrl } from '@/lib/share';
import { findOccurrenceByKey, occurrenceKey } from '@/lib/calendar-selection';
import { normalizePublicUrl } from '@/lib/url-config';
import {localePath,type Locale} from '@/lib/i18n-config';

type Props = {
  event: {
    slug: string;
    title: string;
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    scheduleType: 'single' | 'continuous' | 'recurring' | 'irregular';
    eventStatus: 'scheduled'|'changed'|'postponed'|'cancelled'|'sold_out'|'registration_closed';
    occurrences: Array<{date:string;start_time:string|null;end_time:string|null;status:string}>;
    venueName: string | null;
    address: string;
    latitude: number | null;
    longitude: number | null;
    officialUrl: string;
    pageUrl: string;
    dateText: string;
    placeText: string;
    sharePrefix?: string;
    shareConditionText?: string;
    shareSummary?: string;
    shareTimeText?: string;
  };
};


const actionCopy:Record<Locale,{
  eyebrow:string;heading:string;calendarDate:string;verifyDate:string;visitDate:string;
  saved:string;savedDone:string;attended:string;attendedDone:string;calendarApp:string;
  verifyOfficial:string;latestOfficial:string;parking:string;parkingReserve:string;dining:string;share:string;
  timeUnknown:string;soldOut:string;registrationClosed:string
}>={
  ja:{eyebrow:'行くと決めたら',heading:'当日までここから準備',calendarDate:'カレンダーに入れる開催日',verifyDate:'開催日を公式情報で確認',visitDate:'自分が行く予定日（任意）',saved:'行きたい',savedDone:'行きたい保存済み',attended:'行った',attendedDone:'行った・保存済み',calendarApp:'カレンダーアプリ',verifyOfficial:'開催日を公式で確認',latestOfficial:'最新状況を公式で確認',parking:'駐車場を探す',parkingReserve:'予約できる駐車場',dining:'遊んだ後のごはん',share:'Xで共有',timeUnknown:'時間未定',soldOut:'完売',registrationClosed:'受付終了'},
  en:{eyebrow:'Once you decide to go',heading:'Prepare everything from here',calendarDate:'Date to add to calendar',verifyDate:'Check dates on the official site',visitDate:'Your planned visit date (optional)',saved:'Want to go',savedDone:'Saved',attended:'I went',attendedDone:'Visited · saved',calendarApp:'Calendar app',verifyOfficial:'Check event date officially',latestOfficial:'Check latest official status',parking:'Find parking',parkingReserve:'Reservable parking',dining:'Food after the event',share:'Share on X',timeUnknown:'Time TBD',soldOut:'Sold out',registrationClosed:'Registration closed'},
  'zh-cn':{eyebrow:'决定参加后',heading:'从这里准备当天行程',calendarDate:'加入日历的举办日期',verifyDate:'请在官网确认举办日期',visitDate:'计划前往日期（可选）',saved:'想去',savedDone:'已保存想去',attended:'去过',attendedDone:'已去过・已保存',calendarApp:'日历应用',verifyOfficial:'在官网确认举办日期',latestOfficial:'在官网确认最新状态',parking:'查找停车场',parkingReserve:'可预约停车场',dining:'活动后的用餐',share:'分享到 X',timeUnknown:'时间未定',soldOut:'售罄',registrationClosed:'报名截止'},
  'zh-tw':{eyebrow:'決定參加後',heading:'從這裡準備當天行程',calendarDate:'加入行事曆的舉辦日期',verifyDate:'請在官網確認舉辦日期',visitDate:'預計前往日期（可選）',saved:'想去',savedDone:'已儲存想去',attended:'去過',attendedDone:'已去過・已儲存',calendarApp:'行事曆 App',verifyOfficial:'在官網確認舉辦日期',latestOfficial:'在官網確認最新狀態',parking:'尋找停車場',parkingReserve:'可預約停車場',dining:'活動後的用餐',share:'分享到 X',timeUnknown:'時間未定',soldOut:'售罄',registrationClosed:'報名截止'},
  ko:{eyebrow:'가기로 정했다면',heading:'당일까지 여기서 준비',calendarDate:'캘린더에 넣을 개최일',verifyDate:'공식 사이트에서 개최일 확인',visitDate:'내가 갈 예정일(선택)',saved:'가고 싶어요',savedDone:'가고 싶어요 저장됨',attended:'다녀왔어요',attendedDone:'다녀옴・저장됨',calendarApp:'캘린더 앱',verifyOfficial:'공식 사이트에서 개최일 확인',latestOfficial:'공식 사이트에서 최신 상태 확인',parking:'주차장 찾기',parkingReserve:'예약 가능한 주차장',dining:'행사 후 식사',share:'X로 공유',timeUnknown:'시간 미정',soldOut:'매진',registrationClosed:'접수 종료'}
};

function todayJa(){
  return new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date());
}

function addDays(date: string, days: number) {
  const [y,m,d] = date.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);
}

export function EventActions({ event, locale='ja' }: Props & {locale?:Locale}) {
  const t=actionCopy[locale] || actionCopy.ja;
  const [saved, setSaved] = useState(false);
  const [attended,setAttended]=useState(false);
  const today=todayJa();
  const eventAvailable=event.endDate>=today
    && !['cancelled','postponed','sold_out','registration_closed'].includes(event.eventStatus);
  const availableOccurrences=event.occurrences.filter((item)=>item.status==='scheduled' && item.date>=today);
  const [selectedOccurrence,setSelectedOccurrence]=useState('');
  const [continuousVisitDate,setContinuousVisitDate]=useState('');

  useEffect(() => {
    const sync=()=>{
      setSaved(readStringArray(PREF_KEYS.savedEvents).includes(event.slug));
      setAttended(readStringArray(PREF_KEYS.attendedEvents).includes(event.slug));
    };
    sync();
    const planned=getPlannedDate(event.slug);
    if(event.scheduleType==='recurring'||event.scheduleType==='irregular'){
      const savedOccurrenceKey=getPlannedOccurrence(event.slug);
      const savedOccurrence=findOccurrenceByKey(availableOccurrences,savedOccurrenceKey);
      const plannedOccurrence=availableOccurrences.find((item)=>item.date===planned);
      const initialOccurrence=savedOccurrence || plannedOccurrence || availableOccurrences[0];
      setSelectedOccurrence(initialOccurrence ? occurrenceKey(initialOccurrence) : '');
    } else if(event.scheduleType==='continuous' && event.startDate!==event.endDate) {
      const earliest=event.startDate>today ? event.startDate : today;
      setContinuousVisitDate(planned && planned>=earliest && planned<=event.endDate ? planned : '');
    }
    window.addEventListener('machiibe:prefs',sync);
    return ()=>window.removeEventListener('machiibe:prefs',sync);
  }, [event.slug]);

  const calendarSelection=useMemo(()=>{
    if((event.scheduleType==='recurring'||event.scheduleType==='irregular') && selectedOccurrence){
      const occurrence=findOccurrenceByKey(availableOccurrences,selectedOccurrence);
      if(occurrence) return {
        startDate:occurrence.date,
        endDate:occurrence.date,
        startTime:occurrence.start_time,
        endTime:occurrence.end_time
      };
    }
    if(event.scheduleType==='continuous' && continuousVisitDate){
      return {startDate:continuousVisitDate,endDate:continuousVisitDate,startTime:event.startTime,endTime:event.endTime};
    }
    return {startDate:event.startDate,endDate:event.endDate,startTime:event.startTime,endTime:event.endTime};
  },[availableOccurrences,continuousVisitDate,event.endDate,event.endTime,event.scheduleType,event.startDate,event.startTime,selectedOccurrence]);

  const googleCalendarUrl = useMemo(() => {
    const compact = (date: string, time: string | null) => {
      if (!time) return date.replaceAll('-', '');
      return `${date.replaceAll('-', '')}T${time.replaceAll(':','').slice(0,6)}`;
    };
    const timed = Boolean(calendarSelection.startTime || calendarSelection.endTime);
    const googleEndDate = timed ? calendarSelection.endDate : addDays(calendarSelection.endDate, 1);
    const googleStart=compact(calendarSelection.startDate,calendarSelection.startTime);
    const googleEnd=calendarSelection.startTime && !calendarSelection.endTime
      ? googleStart
      : compact(googleEndDate,calendarSelection.endTime);
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('ctz', 'Asia/Tokyo');
    url.searchParams.set('text', event.title);
    url.searchParams.set('dates', `${googleStart}/${googleEnd}`);
    url.searchParams.set('location', [event.venueName,event.address].filter(Boolean).join(' '));
    url.searchParams.set('details', event.officialUrl);
    return url.toString();
  }, [calendarSelection,event.address,event.title,event.venueName,event.officialUrl]);

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
  const diningUrl = `${localePath('/dining',locale)}?${diningParams.toString()}`;
  const parkingReservationUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_PARKING_RESERVATION_URL,{httpsOnly:true});
  const xShareUrl=buildXShareUrl({
    title:event.title,
    pageUrl:event.pageUrl,
    dateText:event.dateText,
    placeText:event.placeText,
    prefix:event.sharePrefix,
    conditionText:event.shareConditionText,
    summary:event.shareSummary,
    timeText:event.shareTimeText
  });

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

  const selectedOccurrenceRow=findOccurrenceByKey(availableOccurrences,selectedOccurrence);
  const calendarAppQuery=selectedOccurrenceRow
    ? `?date=${encodeURIComponent(selectedOccurrenceRow.date)}${selectedOccurrenceRow.start_time?`&time=${encodeURIComponent(selectedOccurrenceRow.start_time)}`:''}`
    : continuousVisitDate
      ? `?date=${encodeURIComponent(continuousVisitDate)}`
      : '';

  const metric=(name:string)=>()=>{ recordMetric(name,event.slug); };

  return (
    <section className="event-action-hub">
      <div className="action-hub-title">
        <span>{t.eyebrow}</span>
        <strong>{t.heading}</strong>
      </div>
      {eventAvailable && (event.scheduleType==='recurring'||event.scheduleType==='irregular') && (
        <label className="occurrence-picker">
          <span>{t.calendarDate}</span>
          <select value={selectedOccurrence} onChange={(e)=>{
            const key=e.target.value;
            setSelectedOccurrence(key);
            const occurrence=findOccurrenceByKey(availableOccurrences,key);
            setPlannedDate(event.slug,occurrence?.date||'');
            setPlannedOccurrence(event.slug,occurrence?key:'');
          }}>
            {availableOccurrences.length ? availableOccurrences.map((item)=>(
              <option key={occurrenceKey(item)} value={occurrenceKey(item)}>
                {item.date}{item.start_time?` ${item.start_time.slice(0,5)}`:''}{item.status==='sold_out'?` (${t.soldOut})`:item.status==='registration_closed'?` (${t.registrationClosed})`:''}
              </option>
            )) : <option value="">{t.verifyDate}</option>}
          </select>
        </label>
      )}
      {eventAvailable && event.scheduleType==='continuous' && event.startDate!==event.endDate && (
        <label className="occurrence-picker">
          <span>{t.visitDate}</span>
          <input
            type="date"
            min={event.startDate>today?event.startDate:today}
            max={event.endDate}
            value={continuousVisitDate}
            onChange={(e)=>{setContinuousVisitDate(e.target.value);setPlannedDate(event.slug,e.target.value);}}
          />
        </label>
      )}
      <div className="event-action-grid">
        <button type="button" className={`event-action-button ${saved ? 'is-saved' : ''}`} onClick={toggleSaved}>
          <span>♡</span><b>{saved ? t.savedDone : t.saved}</b>
        </button>
        <button type="button" className={`event-action-button ${attended ? 'is-attended' : ''}`} onClick={toggleAttended}>
          <span>✓</span><b>{attended ? t.attendedDone : t.attended}</b>
        </button>
        {eventAvailable && (availableOccurrences.length || (event.scheduleType!=='recurring'&&event.scheduleType!=='irregular')) ? (
          <>
            <a className="event-action-button" href={googleCalendarUrl} target="_blank" rel="noreferrer" onClick={metric('calendar_google')}><span>📅</span><b>Googleカレンダー</b></a>
            <a className="event-action-button" href={`/api/calendar/${event.slug}${calendarAppQuery}`} onClick={metric('calendar_ics')}><span>＋</span><b>{t.calendarApp}</b></a>
          </>
        ) : (
          <a className="event-action-button" href={event.officialUrl} target="_blank" rel="noreferrer"><span>📅</span><b>{eventAvailable?t.verifyOfficial:t.latestOfficial}</b></a>
        )}
        <a className="event-action-button" href={googleMapsUrl} target="_blank" rel="noreferrer" onClick={metric('map_google')}><span>📍</span><b>Google Maps</b></a>
        <a className="event-action-button" href={appleMapsUrl} target="_blank" rel="noreferrer" onClick={metric('map_apple')}><span></span><b>Apple Maps</b></a>
        <a className="event-action-button" href={parkingUrl} target="_blank" rel="noreferrer" onClick={metric('parking_search')}><span>🅿</span><b>{t.parking}</b></a>
        {parkingReservationUrl && (
          <a className="event-action-button pr-action" href={parkingReservationUrl} target="_blank" rel="sponsored noreferrer" onClick={metric('parking_search')}>
            <span>🅿</span><b>{t.parkingReserve}</b><small>PR</small>
          </a>
        )}
        <a className="event-action-button dining-action" href={diningUrl} onClick={metric('dining_open')}><span>🍽</span><b>{t.dining}</b></a>
        <a className="event-action-button x-share-action" href={xShareUrl} target="_blank" rel="noreferrer" onClick={metric('x_share')}><span>𝕏</span><b>{t.share}</b></a>
      </div>
    </section>
  );
}
