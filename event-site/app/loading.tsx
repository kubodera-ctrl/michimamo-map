export default function Loading() {
  return (
    <main className="content-wrap area-page" aria-busy="true" aria-live="polite">
      <div className="loading-shell">
        <div className="loading-line loading-title" />
        <div className="loading-line" />
        <div className="loading-grid">
          <div className="loading-card" /><div className="loading-card" /><div className="loading-card" />
        </div>
        <span className="sr-only">読み込み中</span>
      </div>
    </main>
  );
}
