import {NextResponse} from 'next/server';
import {
  getMachiibeAspOffersForPlacement,
  recordMachiibeAspClick,
  validAspOfferId,
  validAspPlacementId
} from '@/lib/asp-runtime';

export const runtime='nodejs';
type Params=Promise<{offerId:string}>;

export async function GET(request:Request,{params}:{params:Params}){
  const {offerId}=await params;
  const url=new URL(request.url);
  const placement=(url.searchParams.get('placement')||'').trim();
  const screen=(url.searchParams.get('screen')||'').trim().slice(0,100);

  if(!validAspOfferId(offerId)||!validAspPlacementId(placement)||!screen){
    return new Response('Not Found',{status:404});
  }

  const offers=await getMachiibeAspOffersForPlacement(placement);
  const offer=offers.find((item)=>item.offer_id===offerId);
  if(!offer) return new Response('Not Found',{status:404});

  const anonymousSessionId=crypto.randomUUID();
  await recordMachiibeAspClick({
    offerId,
    placementId:placement,
    sourceScreen:screen,
    anonymousSessionId
  }).catch(()=>false);

  return NextResponse.redirect(offer.tracking_url,303);
}
