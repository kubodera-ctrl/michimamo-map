export function HomePrSlot(){
  const url=process.env.NEXT_PUBLIC_HOME_PR_URL || 'https://sites.google.com/sumion.net/sumion/home?authuser=0&pli=1';
  const imageUrl=process.env.NEXT_PUBLIC_HOME_PR_IMAGE_URL || '';

  const title=process.env.NEXT_PUBLIC_HOME_PR_TITLE || 'SUMION合同会社';
  const description=process.env.NEXT_PUBLIC_HOME_PR_DESCRIPTION || 'まちイベを運営するSUMION合同会社の公式サイト';
  const inner=(
    <>
      <div className="home-pr-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : <span>PR</span>}
      </div>
      <div className="home-pr-copy">
        <div className="home-pr-meta"><b>PR</b><span>スポンサー・運営からのお知らせ</span></div>
        <strong>{title}</strong>
        <p>{description}</p>
        {url && <small>詳しく見る →</small>}
      </div>
    </>
  );

  return (
    <aside className="home-pr-slot" aria-label="PR">
      <a href={url} target="_blank" rel="sponsored noreferrer">{inner}</a>
    </aside>
  );
}
