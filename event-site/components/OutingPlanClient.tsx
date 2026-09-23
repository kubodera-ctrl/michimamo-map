'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getEventsBySlugs } from '@/lib/events';
import { PREF_KEYS, getPlannedDate, getPlannedOccurrence, readStringArray, setPlannedDate, setPlannedOccurrence } from '@/lib/client-prefs';
import type { EventDetail } from '@/lib/types';
import { activeOccurrencesForDate, findOccurrenceByKey, occurrenceKey, uniqueOccurrenceDates } from '@/lib/calendar-selection';
import {localePath,type Locale} from '@/lib/i18n-config';


const planCopy:Record<Locale,{loading:string;emptyTitle:string;emptyCopy:string;unset:string;today:string;timeUnknown:string;visitDay:string;select:string;time:string}>={
  ja:{loading:'おでかけプランを準備しています…',emptyTitle:'まず「行きたい」を追加してください',emptyCopy:'保存したイベントから予定日を決めると、日付ごとにまとめられます。',unset:'予定日未設定',today:'今日',timeUnknown:'時間未定',visitDay:'行く日',select:'選択',time:'時間'},
  en:{loading:'Preparing your outing plan…',emptyTitle:'Add some “Want to go” events first',emptyCopy:'Choose planned dates for saved events to organize them by day.',unset:'Date not set',today:'Today',timeUnknown:'Time TBD',visitDay:'Visit date',select:'Select',time:'Time'},
  'zh-cn':{loading:'正在准备出游计划…',emptyTitle:'请先添加“想去”的活动',emptyCopy:'为已保存活动选择计划日期后，可按日期整理。',unset:'未设置计划日期',today:'今天',timeUnknown:'时间未定',visitDay:'前往日期',select:'选择',time:'时间'},
  'zh-tw':{loading:'正在準備出遊計畫…',emptyTitle:'請先新增「想去」的活動',emptyCopy:'為已儲存活動選擇預計日期後，可依日期整理。',unset:'未設定預計日期',today:'今天',timeUnknown:'時間未定',visitDay:'前往日期',select:'選擇',time:'時間'},
  ko:{loading:'나들이 계획을 준비하는 중…',emptyTitle:'먼저 「가고 싶어요」 이벤트를 추가하세요',emptyCopy:'저장한 이벤트의 예정일을 정하면 날짜별로 정리할 수 있습니다.',unset:'예정일 미설정',today:'오늘',timeUnknown:'시간 미정',visitDay:'가는 날',select:'선택',time:'시간'}
};

function todayJa(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date());
}

function canPlanEvent(event:EventDetail){
  return event.end_date>=todayJa()
    && !['cancelled','postponed','sold_out','registration_closed'].includes(event.event_status);
}

function dateOptions(event:EventDetail):string[] {
  if(!canPlanEvent(event)) return [];
  if(event.schedule_type==='recurring'||event.schedule_type==='irregular'){
    return uniqueOccurrenceDates(event.occurrences||[]).filter((date)=>date>=todayJa());
  }
  if(event.schedule_type==='single') return [event.start_date];
  return [];
}

export function OutingPlanClient({locale='ja'}:{locale?:Locale}) {
  const t=planCopy[locale] || planCopy.ja;
  const [events,setEvents]=useState<EventDetail[]>([]);
  const [planned,setPlanned]=useState<Record<string,string>>({});
  const [plannedOccurrences,setPlannedOccurrences]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const rows=await getEventsBySlugs(readStringArray(PREF_KEYS.savedEvents),locale);
      const dates=Object.fromEntries(rows.map((event)=>{
        if(!canPlanEvent(event)) return [event.slug,''];
        const savedDate=getPlannedDate(event.slug);
        const earliest=event.start_date>todayJa()?event.start_date:todayJa();
        const validSaved=savedDate && savedDate>=earliest && savedDate<=event.end_date ? savedDate : '';
        return [event.slug,validSaved || (event.schedule_type==='single'?event.start_date:'')];
      }));
      const occurrences=Object.fromEntries(rows.map((event)=>{
        const saved=getPlannedOccurrence(event.slug);
        const savedRow=findOccurrenceByKey(event.occurrences||[],saved);
        const valid=savedRow?.status==='scheduled' && savedRow.date>=todayJa() ? savedRow : undefined;
        const plannedDate=dates[event.slug]||'';
        const firstForDate=(event.occurrences||[]).find((item)=>item.status==='scheduled'&&item.date>=todayJa()&&item.date===plannedDate);
        return [event.slug,valid?saved:(firstForDate?occurrenceKey(firstForDate):'')];
      }));
      if(!cancelled){setEvents(rows);setPlanned(dates);setPlannedOccurrences(occurrences);setLoading(false);}
    };
    void load();
    return ()=>{cancelled=true;};
  },[locale]);

  const groups=useMemo(()=>{
    const map=new Map<string,EventDetail[]>();
    for(const event of events){
      const date=planned[event.slug] || '';
      const key=date || '__unset__';
      const list=map.get(key)||[];
      list.push(event);
      map.set(key,list);
    }
    for(const list of map.values()) list.sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')||a.title.localeCompare(b.title));
    return [...map.entries()].sort(([a],[b])=>{
      if(a==='__unset__') return 1;
      if(b==='__unset__') return -1;
      return a.localeCompare(b);
    });
  },[events,planned]);

  const change=(event:EventDetail,date:string)=>{
    setPlanned((current)=>({...current,[event.slug]:date}));
    setPlannedDate(event.slug,date);
    const firstForDate=activeOccurrencesForDate(event.occurrences||[],date)[0];
    const key=firstForDate?occurrenceKey(firstForDate):'';
    setPlannedOccurrences((current)=>({...current,[event.slug]:key}));
    setPlannedOccurrence(event.slug,key);
  };

  const changeOccurrence=(event:EventDetail,key:string)=>{
    const occurrence=findOccurrenceByKey(event.occurrences||[],key);
    setPlannedOccurrences((current)=>({...current,[event.slug]:key}));
    setPlannedOccurrence(event.slug,key);
    if(occurrence){
      setPlanned((current)=>({...current,[event.slug]:occurrence.date}));
      setPlannedDate(event.slug,occurrence.date);
    }
  };

  if(loading) return <div className="empty-state"><p>{t.loading}</p></div>;
  if(!events.length) return <div className="empty-state"><h2>{t.emptyTitle}</h2><p>{t.emptyCopy}</p></div>;

  return (
    <div className="plan-groups">
      {groups.map(([date,list])=>(
        <section className="plan-day" key={date}>
          <div className="plan-day-heading">
            <h2>{date==='__unset__'?t.unset:date}</h2>
            {date!== '__unset__' && date===todayJa() && <span>{t.today}</span>}
          </div>
          <div className="plan-list">
            {list.map((event)=>{
              const options=dateOptions(event);
              const selectedOccurrence=findOccurrenceByKey(event.occurrences||[],plannedOccurrences[event.slug]||'');
              const sessions=activeOccurrencesForDate(event.occurrences||[],planned[event.slug]||'').filter((item)=>item.date>=todayJa());
              const displayTime=selectedOccurrence?.start_time || event.start_time;
              return (
                <article className="plan-item" key={event.slug}>
                  <div className="plan-time">{displayTime?.slice(0,5)||t.timeUnknown}</div>
                  <div className="plan-main">
                    <Link href={localePath(`/events/${event.slug}`,locale)}><strong>{event.title}</strong></Link>
                    <p>{[event.prefecture,event.municipality,event.venue_name].filter(Boolean).join(' · ')}</p>
                    {canPlanEvent(event) && event.schedule_type==='continuous' && event.start_date!==event.end_date ? (
                      <label>{t.visitDay}
                        <input type="date" min={event.start_date>todayJa()?event.start_date:todayJa()} max={event.end_date} value={planned[event.slug]||''} onChange={(e)=>change(event,e.target.value)} />
                      </label>
                    ) : options.length>1 ? (
                      <label>行く日
                        <select value={planned[event.slug]||''} onChange={(e)=>change(event,e.target.value)}>
                          <option value="">{t.select}</option>
                          {options.map((date)=><option key={date} value={date}>{date}</option>)}
                        </select>
                      </label>
                    ) : null}
                    {sessions.length>1 && (
                      <label>{t.time}
                        <select value={plannedOccurrences[event.slug]||''} onChange={(e)=>changeOccurrence(event,e.target.value)}>
                          {sessions.map((item)=>(
                            <option key={occurrenceKey(item)} value={occurrenceKey(item)}>
                              {item.start_time?.slice(0,5)||t.timeUnknown}
                              {item.end_time?`〜${item.end_time.slice(0,5)}`:''}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
