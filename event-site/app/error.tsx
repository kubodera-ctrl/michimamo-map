'use client';

export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}) {
  return (
    <main className="content-wrap area-page">
      <div className="empty-state data-unavailable" role="alert">
        <div className="empty-icon">!</div>
        <h1>ページを表示できませんでした</h1>
        <p>一時的な通信エラーの可能性があります。再読み込みしても解消しない場合は、少し時間をおいてください。</p>
        <button className="search-button error-retry" type="button" onClick={reset}>もう一度試す</button>
      </div>
    </main>
  );
}
