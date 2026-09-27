import {aspClickPath,getMachiibeAspOffersForPlacement,validAspPlacementId} from '@/lib/asp-runtime';

export async function AspPlacement({
  placementId,
  sourceScreen,
  className='home-pr-slot',
  limit=1
}:{
  placementId:string;
  sourceScreen:string;
  className?:string;
  limit?:number;
}){
  if(!validAspPlacementId(placementId)) return null;
  const offers=await getMachiibeAspOffersForPlacement(placementId);
  const visible=offers.slice(0,Math.min(Math.max(limit,1),3));
  if(!visible.length) return null;

  return (
    <aside className={className} aria-label="PR">
      {visible.map((offer)=>{
        const href=aspClickPath(offer.offer_id,placementId,sourceScreen);
        if(!href) return null;
        return (
          <a key={offer.offer_id} href={href} target="_blank" rel="sponsored noreferrer">
            <div className="home-pr-media">
              <div className="home-pr-placeholder" aria-hidden="true">
                <small>{offer.asp}</small>
                <strong>{offer.advertiser_name}</strong>
                <span>PR</span>
              </div>
              <i className="home-pr-corner" aria-hidden="true">AD / PARTNER</i>
            </div>
            <div className="home-pr-copy">
              <div className="home-pr-meta"><b>PR</b><span>広告・パートナー情報</span></div>
              <strong>{offer.offer_name}</strong>
              {offer.category&&<p>{offer.category}</p>}
              <small>詳しく見る →</small>
            </div>
          </a>
        );
      })}
    </aside>
  );
}
