import type {Metadata} from 'next';
import Link from 'next/link';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {
  MACHIIBE_CAROUSEL_CURRENT,
  MACHIIBE_VIDEO_CURRENT
} from '@/lib/machiibe-production-master';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Production Master',robots:{index:false,follow:false}};

export default async function SocialMasterPage(){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');

  return (
    <main className="admin-shell">
      <nav className="breadcrumb" aria-label="パンくず"><Link href="/admin">運営ダッシュボード</Link><span>›</span><span>Production Master</span></nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">MACHI IBE PRODUCTION MASTER</p>
          <h1>まちイベ CURRENT Production Master</h1>
          <p>Drive CURRENT 2026-09-27を正本とし、旧TikTok固定5Frame仕様はProduction CURRENTとして使用しません。</p>
        </div>
        <Link className="admin-back-link" href="/admin">運営ダッシュボードへ</Link>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>CAROUSEL — ACTIVE</h2>
            <p>{MACHIIBE_CAROUSEL_CURRENT.masterVersion}</p>
          </div>
        </div>
        <div className="social-master-frame-grid">
          <article><b>1</b><strong>表紙</strong><span>地域 / 期間 / キャッチ / ロゴ</span></article>
          <article><b>2</b><strong>見どころ</strong><span>確認済みジャンル・選び方</span></article>
          <article><b>MIDDLE</b><strong>イベント詳細</strong><span>事実を削らず1〜2イベント/枚を基本</span></article>
          <article><b>LAST</b><strong>CTA</strong><span>まちイベ検索 + 保存共有 + まちまも安全導線</span></article>
        </div>

        <div className="admin-bottom-note">
          <strong>可変ページ数</strong>
          <p>3〜4件=5枚 / 5〜6件=6枚 / 7〜8件=7枚 / 9〜10件=8枚。11件以上は8枚へ詰めずPart分割。</p>
        </div>

        <div className="admin-bottom-note">
          <strong>公開ゲート</strong>
          <p>{MACHIIBE_CAROUSEL_CURRENT.publishGate.join(' → ')}</p>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>画像・事実ルール</h2>
            <p>AIは確認済み事実を整理できますが、事実値や権利状態を補完しません。</p>
          </div>
        </div>
        <ul className="admin-master-copy">
          <li>開催日・時間・会場・住所・市区町村・料金・対象年齢・予約・雨天・主催・公式URL・中止延期終了は推測禁止。</li>
          <li>権利確認済み公式画像 → 提供画像 → 一般イメージ → AI一般イメージ。unknown / blockedのイベント素材は自動利用禁止。</li>
          <li>一般/AIイメージは必要な免責を必須化。</li>
          <li>Golden Snapshotはテスト失敗時に自動更新しない。</li>
        </ul>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>VIDEO — MASTER待ち</h2>
            <p>共通Publishing基盤はVIDEOを扱えるようにしますが、まちイベ用の正式VIDEO CURRENTがDriveに登録されるまで生成を有効化しません。</p>
          </div>
        </div>
        <div className="admin-warning">{MACHIIBE_VIDEO_CURRENT.reason}</div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>SNS Publishing</h2>
            <p>CAROUSEL生成・QC・承認の後に、X / TikTokへRevision単位で投稿します。</p>
          </div>
        </div>
        <p className="admin-master-copy">同一Revisionの二重投稿は idempotency で防止し、外部投稿完了を確認してから「済」とします。</p>
      </section>
    </main>
  );
}
