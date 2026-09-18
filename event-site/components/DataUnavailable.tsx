export function DataUnavailable() {
  return (
    <div className="empty-state data-unavailable" role="status">
      <div className="empty-icon">!</div>
      <h2>イベント情報を一時的に取得できません</h2>
      <p>検索条件の問題ではありません。少し時間をおいて再読み込みしてください。情報源の停止時も、確認済みデータまで消えない構成で運用します。</p>
    </div>
  );
}
