import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="content-wrap area-page">
      <div className="empty-state">
        <div className="empty-icon">404</div>
        <h1>ページが見つかりません</h1>
        <p>イベントが終了・非公開になったか、URLが変更された可能性があります。</p>
        <p><Link className="primary-action inline-action" href="/">まちイベTOPへ戻る</Link></p>
      </div>
    </main>
  );
}
