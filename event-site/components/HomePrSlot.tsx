export function HomePrSlot(){
  const url=process.env.NEXT_PUBLIC_HOME_PR_URL || '';
  const imageUrl=process.env.NEXT_PUBLIC_HOME_PR_IMAGE_URL || '';
  const isPreview=process.env.NEXT_PUBLIC_ALLOW_INDEXING!=='true';

  if(!url && !isPreview) return null;

  const title=process.env.NEXT_PUBLIC_HOME_PR_TITLE || (url ? 'SUMION合同会社' : 'PR掲載枠');
  const description=process.env.NEXT_PUBLIC_HOME_PR_DESCRIPTION
    || (url ? 'まちイベ運営会社からのお知らせ' : '広告・運営会社PRを掲載するためのプレビュー枠です。');
  const inner=(
    <>
      <div className="home-pr-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : <span>PR</span>}
      </div>
      <div className="home-pr-copy">
        <div className="home-pr-meta"><b>PR</b><span>{url ? 'スポンサー・運営からのお知らせ' : 'プレビュー'}</span></div>
        <strong>{title}</strong>
        <p>{description}</p>
        {url && <small>詳しく見る →</small>}
      </div>
    </>
  );

  return (
    <aside className="home-pr-slot" aria-label="PR">
      {url ? (
        <a href={url} target="_blank" rel="sponsored noreferrer">{inner}</a>
      ) : (
        <div className="home-pr-preview">{inner}</div>
      )}
    </aside>
  );
}
