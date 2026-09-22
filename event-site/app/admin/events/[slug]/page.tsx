import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {notFound,redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {VENUE_TYPE_OPTIONS} from '@/lib/events';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'イベント運営編集',robots:{index:false,follow:false}};

type Params=Promise<{slug:string}>;
type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

export default async function AdminEventEditPage({params,searchParams}:{params:Params;searchParams:SearchParams}){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  const {slug}=await params;
  const query=await searchParams;
  const db=getAdminSupabase();
  if(!db) redirect('/admin?error=config');

  const {data:event,error}=await db.from('events').select(
    'id,slug,title,summary,start_date,end_date,start_time,end_time,event_status,status_note,venue_name,prefecture,municipality,address,venue_type_keys,price_text,price_type,indoor,audience_intent,official_url,verification_status,publication_status,source_id,last_verified_at'
  ).eq('slug',slug).maybeSingle();
  if(error || !event) notFound();

  const {data:source}=await db.from('regional_sources').select('name,event_use_allowed,is_active').eq('id',event.source_id).maybeSingle();
  const updated=one(query.updated);
  const errorCode=one(query.error);

  return (
    <main className="admin-shell">
      <nav className="breadcrumb" aria-label="パンくず">
        <Link href="/admin">運営ダッシュボード</Link><span>›</span><span>イベント編集</span>
      </nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">MACHI IBE REVIEW</p>
          <h1>イベント確認・公開設定</h1>
          <p>{event.slug}</p>
        </div>
        <Link className="admin-back-link" href={`/events/${event.slug}`} target="_blank">公開ページ確認 ↗</Link>
      </div>

      {updated && <div className="admin-success">更新しました。</div>}
      {errorCode && <div className="admin-error">更新できませんでした：{errorCode}</div>}
      <div className="admin-warning">
        情報源：{source?.name||'不明'} ／ 利用許可：{source?.event_use_allowed?'確認済み':'未確認'} ／ 情報源状態：{source?.is_active?'有効':'無効'}
      </div>

      <form className="admin-event-form" action="/api/admin/events/update" method="post">
        <input type="hidden" name="slug" value={event.slug} />
        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>公開・確認状態</h2><p>公開は「確認済み」かつ情報源利用可の場合のみ保存できます。</p></div></div>
          <div className="admin-edit-grid">
            <label>確認状態
              <select name="verification_status" defaultValue={event.verification_status}>
                <option value="unverified">未確認</option>
                <option value="needs_review">要確認</option>
                <option value="verified">確認済み</option>
              </select>
            </label>
            <label>公開状態
              <select name="publication_status" defaultValue={event.publication_status}>
                <option value="draft">下書き</option>
                <option value="published">公開</option>
                <option value="expired">終了</option>
                <option value="hidden">非表示</option>
              </select>
            </label>
            <label>開催状態
              <select name="event_status" defaultValue={event.event_status}>
                <option value="scheduled">開催予定</option>
                <option value="changed">内容変更あり</option>
                <option value="postponed">延期</option>
                <option value="cancelled">中止</option>
                <option value="sold_out">完売</option>
                <option value="registration_closed">受付終了</option>
              </select>
            </label>
            <label className="admin-edit-wide">状態メモ
              <input name="status_note" maxLength={500} defaultValue={event.status_note||''} />
            </label>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>基本情報</h2><p>公式情報を見ながら事実項目だけ修正してください。</p></div></div>
          <div className="admin-edit-grid">
            <label className="admin-edit-wide">イベント名
              <input name="title" required maxLength={300} defaultValue={event.title} />
            </label>
            <label>開始日<input type="date" name="start_date" required defaultValue={event.start_date} /></label>
            <label>終了日<input type="date" name="end_date" required defaultValue={event.end_date} /></label>
            <label>開始時刻<input type="time" name="start_time" defaultValue={event.start_time?.slice(0,5)||''} /></label>
            <label>終了時刻<input type="time" name="end_time" defaultValue={event.end_time?.slice(0,5)||''} /></label>
            <label className="admin-edit-wide">概要
              <textarea name="summary" rows={4} maxLength={2000} defaultValue={event.summary||''} />
            </label>
            <label>会場名<input name="venue_name" maxLength={300} defaultValue={event.venue_name||''} /></label>
            <label>都道府県<input name="prefecture" required maxLength={20} defaultValue={event.prefecture} /></label>
            <label>市区町村<input name="municipality" maxLength={100} defaultValue={event.municipality||''} /></label>
            <label className="admin-edit-wide">住所<input name="address" maxLength={500} defaultValue={event.address||''} /></label>
            <div className="admin-edit-wide admin-venue-types">
              <span>場所タイプ</span>
              <div>
                {VENUE_TYPE_OPTIONS.map(([key,label])=>(
                  <label key={key}><input type="checkbox" name="venue_type" value={key} defaultChecked={(event.venue_type_keys||[]).includes(key)} />{label}</label>
                ))}
              </div>
            </div>
            <label className="admin-edit-wide">公式URL<input type="url" name="official_url" required maxLength={1000} defaultValue={event.official_url} /></label>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>料金・対象</h2></div></div>
          <div className="admin-edit-grid">
            <label>料金区分
              <select name="price_type" defaultValue={event.price_type}>
                <option value="free">完全無料</option>
                <option value="partly_free">一部無料</option>
                <option value="paid">有料</option>
                <option value="unknown">不明</option>
              </select>
            </label>
            <label className="admin-edit-wide">料金説明<input name="price_text" maxLength={1000} defaultValue={event.price_text||''} /></label>
            <label>屋内
              <select name="indoor" defaultValue={event.indoor===true?'true':event.indoor===false?'false':''}>
                <option value="">不明</option><option value="true">屋内</option><option value="false">屋外/屋内限定でない</option>
              </select>
            </label>
            <label>対象傾向
              <select name="audience_intent" defaultValue={event.audience_intent}>
                <option value="child_centered">子どもが主役</option>
                <option value="family_friendly">ファミリー向け</option>
                <option value="general">一般</option>
                <option value="adult_oriented">大人向け</option>
              </select>
            </label>
          </div>
        </section>

        <div className="admin-event-submit">
          <button className="admin-primary" type="submit">確認して保存</button>
          <Link href="/admin#new-events">キャンセル</Link>
        </div>
      </form>
    </main>
  );
}
