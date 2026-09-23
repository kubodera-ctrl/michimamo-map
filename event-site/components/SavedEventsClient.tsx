'use client';

import { useEffect, useState } from 'react';
import { EventCard } from './EventCard';
import { getEventsBySlugs } from '@/lib/events';
import { PREF_KEYS, readStringArray } from '@/lib/client-prefs';
import type { EventSummary } from '@/lib/types';
import type {Locale} from '@/lib/i18n-config';

type Mode='saved'|'attended';

const copy:Record<Locale,{saved:string;attended:string;loading:string;empty:string;emptyCopy:string;missing:string}>={
  ja:{saved:'「行きたい」',attended:'「行った」',loading:'イベントを読み込んでいます…',empty:'はまだありません',emptyCopy:'イベント詳細から保存すると、ここでまとめて確認できます。',missing:'件は掲載終了・非公開などのため詳細を現在表示できません。'},
  en:{saved:'“Want to go”',attended:'“Visited”',loading:'Loading events…',empty:' is empty',emptyCopy:'Save events from their detail pages to review them here.',missing:' item(s) cannot currently be shown because they ended or are no longer public.'},
  'zh-cn':{saved:'“想去”',attended:'“去过”',loading:'正在加载活动…',empty:'暂时为空',emptyCopy:'可在活动详情页保存，之后在这里集中查看。',missing:'条因活动结束或已下架等原因暂时无法显示详情。'},
  'zh-tw':{saved:'「想去」',attended:'「去過」',loading:'正在載入活動…',empty:'目前為空',emptyCopy:'可在活動詳情頁儲存，之後在這裡集中查看。',missing:'筆因活動結束或已下架等原因目前無法顯示詳情。'},
  ko:{saved:'「가고 싶어요」',attended:'「다녀왔어요」',loading:'이벤트를 불러오는 중…',empty:'가 아직 없습니다',emptyCopy:'이벤트 상세에서 저장하면 여기서 모아볼 수 있습니다.',missing:'건은 종료 또는 비공개 등의 이유로 현재 상세를 표시할 수 없습니다.'}
};

export function SavedEventsClient({mode,locale='ja'}:{mode:Mode;locale?:Locale}) {
  const [events,setEvents]=useState<EventSummary[]>([]);
  const [missingCount,setMissingCount]=useState(0);
  const [loading,setLoading]=useState(true);
  const t=copy[locale] || copy.ja;

  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      setLoading(true);
      const key=mode==='saved'?PREF_KEYS.savedEvents:PREF_KEYS.attendedEvents;
      const slugs=readStringArray(key);
      const rows=await getEventsBySlugs(slugs,locale);
      if(!cancelled){
        setEvents(rows);
        setMissingCount(Math.max(0,slugs.length-rows.length));
        setLoading(false);
      }
    };
    void load();
    const sync=()=>{ void load(); };
    window.addEventListener('machiibe:prefs',sync);
    return ()=>{cancelled=true;window.removeEventListener('machiibe:prefs',sync);};
  },[mode,locale]);

  const label=mode==='saved'?t.saved:t.attended;
  if(loading) return <div className="empty-state"><p>{label} {t.loading}</p></div>;
  if(!events.length && !missingCount) return <div className="empty-state"><h2>{label}{t.empty}</h2><p>{t.emptyCopy}</p></div>;

  return (
    <>
      {missingCount>0 && <div className="history-note">{missingCount}{t.missing}</div>}
      <div className="event-grid">{events.map((event)=><EventCard key={event.id} event={event} respectHidden={false} locale={locale} />)}</div>
    </>
  );
}
