import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, adminConfigReady, validateAdminSession } from '@/lib/admin-auth';
import { getMachiibeAdminDashboard } from '@/lib/admin-dashboard';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'運営ダッシュボード',robots:{index:false,follow:false}};

type SearchParams=Promise<Record<string,string|string[]|undefined>>;
const one=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]||'':v||'';

function n(value:number){return new Intl.NumberFormat('ja-JP').format(value||0);}

export default async function AdminPage({searchParams}:{searchParams:SearchParams}){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  const params=await searchParams;
  const dashboard=await getMachiibeAdminDashboard(30);
  const pickupIds=new Set(dashboard?.pickups.map((item)=>item.event_id)||[]);
  const error=one(params.error);
  const updated=one(params.updated);

  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">MACHI IBE ADMIN</p>
          <h1>まちイベ運営ダッシュボード</h1>
          <p>直近30日を中心に集計。PVはページ表示回数で、ユニークユーザー数ではありません。</p>
          <p><a href={process.env.NEXT_PUBLIC_X_ACCOUNT_URL || 'https://x.com/machiibe01'} target="_blank" rel="noreferrer">運営X @machiibe01 を開く ↗</a></p>
        </div>
        <form action="/api/admin/logout" method="post"><button type="submit">ログアウト</button></form>
      </div>

      {!adminConfigReady() && <div className="admin-warning">管理者用環境変数が未設定です。</div>}
      {!dashboard && <div className="admin-warning">Supabase service roleまたは管理用RPCが未設定です。本番DB反映後に有効になります。</div>}
      {error && <div className="admin-error">操作に失敗しました：{error}</div>}
      {updated && <div className="admin-success">更新しました：{updated}</div>}

      {dashboard && (
        <>
          <section className="admin-stat-grid" aria-label="主要指標">
            <div><span>PV</span><strong>{n(dashboard.summary.pv)}</strong><small>30日</small></div>
            <div><span>LINE認証数</span><strong>{n(dashboard.summary.lineAuthUsers)}</strong><small>共有Auth</small></div>
            <div><span>プロフィール紐付け</span><strong>{n(dashboard.summary.linkedProfiles)}</strong><small>LINE認証後</small></div>
            <div><span>カレンダー追加</span><strong>{n(dashboard.summary.calendarAdds)}</strong><small>Google + ICS</small></div>
            <div><span>まちまも遷移</span><strong>{n(dashboard.summary.machimamoClicks)}</strong><small>クリック</small></div>
            <div><span>X共有</span><strong>{n(dashboard.summary.xShares)}</strong><small>利用者共有</small></div>
            <div><span>検索実行</span><strong>{n(dashboard.summary.searches)}</strong><small>30日</small></div>
            <div><span>イベント閲覧</span><strong>{n(dashboard.summary.eventOpens)}</strong><small>詳細表示等</small></div>
          </section>

          <div className="admin-two-col">
            <section className="admin-panel">
              <div className="admin-panel-head"><div><h2>検索ワードランキング</h2><p>メールアドレスや長い数列は保存対象外。</p></div></div>
              {dashboard.searchTerms.length ? (
                <ol className="admin-ranking">
                  {dashboard.searchTerms.slice(0,20).map((row,index)=>(
                    <li key={row.term}><b>{index+1}</b><span>{row.term}</span><strong>{n(row.count)}</strong></li>
                  ))}
                </ol>
              ) : <p className="admin-empty">まだ検索ワードデータがありません。</p>}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <div><h2>ピックアップイベント</h2><p>人気7日から自動候補を反映できます。中止・延期は対象外。</p></div>
                <form action="/api/admin/pickups/refresh" method="post"><button className="admin-primary" type="submit">人気上位6件を反映</button></form>
              </div>
              {dashboard.pickups.length ? (
                <div className="admin-list">
                  {dashboard.pickups.map((item)=>(
                    <article key={item.event_id}>
                      <div><strong>#{item.rank} {item.title}</strong><small>{item.reason==='popular_7d'?'人気7日':'手動'}・{item.prefecture}{item.municipality||''}</small></div>
                      <form action="/api/admin/pickups/toggle" method="post">
                        <input type="hidden" name="event_id" value={item.event_id} />
                        <input type="hidden" name="enabled" value="0" />
                        <button type="submit">解除</button>
                      </form>
                    </article>
                  ))}
                </div>
              ) : <p className="admin-empty">現在のピックアップはありません。</p>}
            </section>
          </div>

          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>人気イベント</h2><p>サイト内閲覧の参考値。Botや同一利用者の重複閲覧を完全には除外しません。</p></div></div>
            {dashboard.popularEvents.length ? (
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>順位</th><th>イベント</th><th>地域</th><th>閲覧</th><th>ピックアップ</th></tr></thead>
                <tbody>{dashboard.popularEvents.slice(0,20).map((item,index)=>(
                  <tr key={item.id}>
                    <td>{index+1}</td>
                    <td><Link href={`/events/${item.slug}`} target="_blank">{item.title}</Link></td>
                    <td>{item.prefecture}{item.municipality||''}</td>
                    <td>{n(item.count)}</td>
                    <td>
                      <form action="/api/admin/pickups/toggle" method="post">
                        <input type="hidden" name="event_id" value={item.id} />
                        <input type="hidden" name="enabled" value={pickupIds.has(item.id)?'0':'1'} />
                        <button type="submit">{pickupIds.has(item.id)?'解除':'ピックアップ'}</button>
                      </form>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="admin-empty">まだ人気イベント集計がありません。</p>}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>情報源の健康状態</h2><p>取得失敗が続く情報源を先に確認できます。</p></div></div>
            {dashboard.sources.length ? (
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>情報源</th><th>地域</th><th>状態</th><th>失敗</th><th>最終成功</th><th>公開件数</th></tr></thead>
                <tbody>{dashboard.sources.map((source)=>(
                  <tr key={source.id}>
                    <td>{source.name}<small className="admin-source">{source.source_kind}</small></td>
                    <td>{[source.prefecture,source.municipality].filter(Boolean).join(' ')||'全国'}</td>
                    <td><span className={`source-status source-${source.fetch_status}`}>{source.fetch_status}</span></td>
                    <td>{source.consecutive_failures}</td>
                    <td>{source.last_success_at ? new Date(source.last_success_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) : '-'}</td>
                    <td>{n(source.published_count)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="admin-empty">情報源データはまだありません。</p>}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head"><div><h2>新しく検出されたイベント</h2><p>取得元の新着順。X投稿は「公開済み・確認済み」のイベントだけ有効。</p></div></div>
            {dashboard.newDetected.length ? (
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>検出</th><th>イベント</th><th>正規化</th><th>公開状態</th><th>X</th></tr></thead>
                <tbody>{dashboard.newDetected.map((item)=> {
                  const canPost=Boolean(item.slug && item.publication_status==='published' && item.verification_status==='verified' && !['cancelled','postponed','sold_out','registration_closed'].includes(item.event_status||''));
                  return (
                    <tr key={item.id}>
                      <td>{new Date(item.fetched_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}</td>
                      <td>
                        {item.slug ? <Link href={`/events/${item.slug}`} target="_blank">{item.title||item.source_title||'名称未取得'}</Link> : <span>{item.source_title||'名称未取得'}</span>}
                        <small className="admin-source"><a href={item.source_url} target="_blank" rel="noreferrer">取得元</a></small>
                      </td>
                      <td>{item.normalization_status}</td>
                      <td>{item.publication_status||'未紐付け'} / {item.verification_status||'-'}</td>
                      <td>{canPost ? <div className="admin-x-cell"><a className="admin-x-button" href={`/api/admin/x?slug=${encodeURIComponent(item.slug!)}`} target="_blank">𝕏 投稿画面</a>{item.x_last_opened_at && <small>前回作成画面：{new Date(item.x_last_opened_at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})}（{item.x_compose_count}回）</small>}</div> : <span className="admin-muted">公開後</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            ) : <p className="admin-empty">検出データはまだありません。</p>}
          </section>

          <div className="admin-bottom-note">
            <strong>運用上の注意</strong>
            <p>検索ワード・PVは運営改善用の集計値です。個人識別子は保存しません。Xボタンは投稿文を入れた作成画面を開くだけで、自動投稿やXの認証情報保存は行いません。ブラウザで @machiibe01 にログインしていれば、その運営アカウントから確認して投稿できます。</p>
          </div>
        </>
      )}
    </main>
  );
}
