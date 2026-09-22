import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {MACHIIBE_SOCIAL_MASTER,MACHIIBE_SOCIAL_MASTER_VERSION} from '@/lib/machiibe-social-master';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'SNS Production Master',robots:{index:false,follow:false}};

export default async function SocialMasterPage(){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  return (
    <main className="admin-shell">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/admin">運営ダッシュボード</Link><span>›</span><span>SNS Production Master</span></nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">MACHI IBE SOCIAL MASTER</p>
          <h1>X / TikTok 正式マスター</h1>
          <p>{MACHIIBE_SOCIAL_MASTER_VERSION}・AIは文章整理のみ。レイアウトはコード固定。</p>
        </div>
        <Link className="admin-back-link" href="/admin#new-events">SNS素材一覧へ</Link>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>TikTok 固定5Frame</h2><p>Frame1〜4積み上げ + Frame5完全別エンドカード。</p></div></div>
        <div className="social-master-frame-grid">
          {MACHIIBE_SOCIAL_MASTER.tiktok.frames.map((frame)=>(
            <article key={frame.id}>
              <b>FRAME {frame.number}</b>
              <strong>{frame.id.toUpperCase()}</strong>
              <span>{frame.purpose}</span>
              <small>{frame.required.join(' / ')}</small>
            </article>
          ))}
        </div>
        <div className="admin-bottom-note">
          <strong>素材優先</strong>
          <p>許諾済み公式動画 → 許諾済み公式画像 → 運営者提供素材 → ブランドカテゴリービジュアル。公式ページに掲載されているだけでは利用可と判断しません。</p>
        </div>
      </section>

      <div className="admin-two-col">
        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>Frame 4 自動切替</h2><p>デザインは変えず、確認済み内容だけ切り替え。</p></div></div>
          <ol className="social-master-priority">
            <li><b>1</b><span>体験</span><small>宝石、釣り、ガラス、指輪、陶芸など</small></li>
            <li><b>2</b><span>推し活</span><small>確認済み作品・キャラ・出演者</small></li>
            <li><b>3</b><span>子ども・ファミリー</span><small>対象・屋内・料金等</small></li>
            <li><b>4</b><span>雨の日・屋内</span><small>確認済み屋内条件</small></li>
            <li><b>5</b><span>無料</span><small>完全無料を確認できた場合のみ</small></li>
          </ol>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>Frame 5 固定CTA</h2><p>まちイベ→まちまもまで一つの導線にする。</p></div></div>
          <div className="social-master-cta">
            <strong>{MACHIIBE_SOCIAL_MASTER.copy.cta.machiibe}</strong>
            <strong>{MACHIIBE_SOCIAL_MASTER.copy.cta.saveShare}</strong>
            <strong>{MACHIIBE_SOCIAL_MASTER.copy.cta.machimamo}</strong>
            <strong>{MACHIIBE_SOCIAL_MASTER.copy.cta.profile}</strong>
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>X マスター</h2><p>リンククリック優先。自動投稿はしません。</p></div></div>
        <p className="admin-master-copy">フック → 地域 → イベント名 → 日時 → 会場 → 確認済み特徴最大3点 → まちイベ → まちまも → ハッシュタグ最大{MACHIIBE_SOCIAL_MASTER.x.maxHashtags}個。</p>
      </section>
    </main>
  );
}
