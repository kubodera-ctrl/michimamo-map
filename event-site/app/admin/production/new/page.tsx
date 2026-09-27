import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {japanToday,addDays} from '@/lib/events';
import type {EventSummary} from '@/lib/types';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Production作成',robots:{index:false,follow:false}};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

export default async function NewProductionPage({searchParams}:{searchParams:SearchParams}){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  const params=await searchParams;
  const prefecture=one(params.prefecture);
  const from=one(params.from)||japanToday();
  const to=one(params.to)||addDays(from,6);
  const db=getAdminSupabase();
  let events:EventSummary[]=[];
  let error='';

  if(db && prefecture){
    const result=await db.rpc('search_public_events',{
      p_start_date:from,p_end_date:to,p_prefecture:prefecture,p_limit:100,p_offset:0
    });
    if(result.error) error=result.error.message;
    else events=(result.data||[]) as EventSummary[];
  }

  return (
    <main className="admin-shell">
      <nav className="breadcrumb"><Link href="/admin/production">Production一覧</Link><span>›</span><span>新規作成</span></nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">NEW PRODUCTION</p>
          <h1>CAROUSELイベント選択</h1>
          <p>都道府県・期間でDBの確認済み公開イベントを検索し、採用するイベントだけ選択します。</p>
        </div>
      </div>

      <section className="admin-panel">
        <form method="get" className="admin-filter-row">
          <label>都道府県<input name="prefecture" defaultValue={prefecture} placeholder="例：東京都" required /></label>
          <label>開始<input type="date" name="from" defaultValue={from} required /></label>
          <label>終了<input type="date" name="to" defaultValue={to} required /></label>
          <button type="submit">イベント検索</button>
        </form>
        {error && <div className="admin-error">{error}</div>}
      </section>

      {prefecture && (
        <form action="/api/admin/production/create" method="post">
          <input type="hidden" name="prefecture" value={prefecture} />
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to} />
          <input type="hidden" name="production_type" value="CAROUSEL" />

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div><h2>採用選択</h2><p>CURRENTは3件以上。11件以上は自動でPart分割します。</p></div>
            </div>
            <div className="admin-event-select-list">
              {events.map((event)=>(
                <label key={event.id} className="admin-event-select-row">
                  <input type="checkbox" name="event_slug" value={event.slug} />
                  <span><strong>{event.title}</strong><small>{event.start_date}{event.end_date!==event.start_date?`〜${event.end_date}`:''} / {event.municipality||''} / {event.venue_name||'会場未登録'}</small></span>
                </label>
              ))}
              {!events.length && <p className="admin-empty">この条件で公開可能イベントはありません。</p>}
            </div>
          </section>

          <section className="admin-panel">
            <label>特集キー（任意）<input name="feature_key" maxLength={80} placeholder="例：今週末 / 雨の日 / 親子" /></label>
            <label>期間表示<input name="period_label" maxLength={120} defaultValue={`${from}〜${to}`} /></label>
            <button className="admin-primary" type="submit">Facts / Rightsを検証してPostSetを作成</button>
            <p>この操作ではまだ投稿しません。Visual/Golden QCと承認後にpublishEligibleになります。</p>
          </section>
        </form>
      )}
    </main>
  );
}
