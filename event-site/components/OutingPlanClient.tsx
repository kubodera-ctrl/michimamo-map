'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getEventsBySlugs } from '@/lib/events';
import { PREF_KEYS, getPlannedDate, readStringArray, setPlannedDate } from '@/lib/client-prefs';
import type { EventDetail } from '@/lib/types';

function todayJa(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date());
}

function dateOptions(event:EventDetail):string[] {
  if(event.schedule_type==='recurring'||event.schedule_type==='irregular'){
    return (event.occurrences||[]).filter((o)=>o.status!=='cancelled').map((o)=>o.date);
  }
  if(event.schedule_type==='single') return [event.start_date];
  return [];
}

export function OutingPlanClient() {
  const [events,setEvents]=useState<EventDetail[]>([]);
  const [planned,setPlanned]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const rows=await getEventsBySlugs(readStringArray(PREF_KEYS.savedEvents));
      const dates=Object.fromEntries(rows.map((event)=>[
        event.slug,
        getPlannedDate(event.slug) || (event.schedule_type==='single'?event.start_date:'')
      ]));
      if(!cancelled){setEvents(rows);setPlanned(dates);setLoading(false);}
    };
    void load();
    return ()=>{cancelled=true;};
  },[]);

  const groups=useMemo(()=>{
    const map=new Map<string,EventDetail[]>();
    for(const event of events){
      const date=planned[event.slug] || '';
      const key=date || '未設定';
      const list=map.get(key)||[];
      list.push(event);
      map.set(key,list);
    }
    for(const list of map.values()) list.sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')||a.title.localeCompare(b.title));
    return [...map.entries()].sort(([a],[b])=>{
      if(a==='未設定') return 1;
      if(b==='未設定') return -1;
      return a.localeCompare(b);
    });
  },[events,planned]);

  const change=(event:EventDetail,date:string)=>{
    setPlanned((current)=>({...current,[event.slug]:date}));
    setPlannedDate(event.slug,date);
  };

  if(loading) return <div className="empty-state"><p>おでかけプランを準備しています…</p></div>;
  if(!events.length) return <div className="empty-state"><h2>まず「行きたい」を追加してください</h2><p>保存したイベントから予定日を決めると、日付ごとにまとめられます。</p></div>;

  return (
    <div className="plan-groups">
      {groups.map(([date,list])=>(
        <section className="plan-day" key={date}>
          <div className="plan-day-heading">
            <h2>{date==='未設定'?'予定日未設定':date}</h2>
            {date!== '未設定' && date===todayJa() && <span>今日</span>}
          </div>
          <div className="plan-list">
            {list.map((event)=>{
              const options=dateOptions(event);
              return (
                <article className="plan-item" key={event.slug}>
                  <div className="plan-time">{event.start_time?.slice(0,5)||'時間未定'}</div>
                  <div className="plan-main">
                    <Link href={`/events/${event.slug}`}><strong>{event.title}</strong></Link>
                    <p>{[event.prefecture,event.municipality,event.venue_name].filter(Boolean).join(' · ')}</p>
                    {event.schedule_type==='continuous' && event.start_date!==event.end_date ? (
                      <label>行く日
                        <input type="date" min={event.start_date} max={event.end_date} value={planned[event.slug]||''} onChange={(e)=>change(event,e.target.value)} />
                      </label>
                    ) : options.length>1 ? (
                      <label>行く日
                        <select value={planned[event.slug]||''} onChange={(e)=>change(event,e.target.value)}>
                          <option value="">選択</option>
                          {options.map((date)=><option key={date} value={date}>{date}</option>)}
                        </select>
                      </label>
                    ) : null}
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
