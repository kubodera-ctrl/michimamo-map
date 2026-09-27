import {getPublicSupabase} from './supabase';

export type AspRuntimeOffer={
  offer_id:string;
  asp:string;
  program_id:string;
  advertiser_name:string;
  offer_name:string;
  category:string|null;
  creative_type:string|null;
  creative_url:string|null;
  tracking_url:string;
  impression_tracking_url:string|null;
  point_reward_allowed:boolean;
  reward_rule:Record<string,unknown>;
  reward_amount:number|null;
  reward_rate:number|null;
};

const key=/^[a-z0-9][a-z0-9._-]{0,79}$/;
const offerKey=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;

export function validAspPlacementId(value:string){
  return key.test(value);
}

export function validAspOfferId(value:string){
  return offerKey.test(value);
}

export async function getMachiibeAspOffersForPlacement(placementId:string):Promise<AspRuntimeOffer[]>{
  if(!validAspPlacementId(placementId)) return [];
  const db=getPublicSupabase();
  if(!db) return [];
  const {data,error}=await db.rpc('get_asp_offers_for_placement',{
    p_service_key:'machiibe',
    p_placement_id:placementId
  });
  if(error){
    console.error('get_asp_offers_for_placement failed',error.message);
    return [];
  }
  return (Array.isArray(data)?data:[]).filter((row:any)=>
    row
    && validAspOfferId(String(row.offer_id||''))
    && typeof row.tracking_url==='string'
    && /^https:\/\//i.test(row.tracking_url)
  ) as AspRuntimeOffer[];
}

export async function recordMachiibeAspClick(input:{
  offerId:string;
  placementId:string;
  sourceScreen:string;
  anonymousSessionId:string;
}){
  if(!validAspOfferId(input.offerId)||!validAspPlacementId(input.placementId)) return false;
  if(!input.sourceScreen||input.sourceScreen.length>100) return false;
  const db=getPublicSupabase();
  if(!db) return false;
  const {error}=await db.rpc('record_asp_offer_click',{
    p_offer_id:input.offerId,
    p_service_key:'machiibe',
    p_placement_id:input.placementId,
    p_source_screen:input.sourceScreen,
    p_anonymous_session_id:input.anonymousSessionId
  });
  if(error){
    console.error('record_asp_offer_click failed',error.message);
    return false;
  }
  return true;
}

export function aspClickPath(offerId:string,placementId:string,sourceScreen:string){
  if(!validAspOfferId(offerId)||!validAspPlacementId(placementId)) return null;
  const screen=sourceScreen.trim().slice(0,100);
  if(!screen) return null;
  return '/api/asp/click/'+encodeURIComponent(offerId)
    +'?placement='+encodeURIComponent(placementId)
    +'&screen='+encodeURIComponent(screen);
}
